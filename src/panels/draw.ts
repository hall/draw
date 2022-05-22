import * as vscode from 'vscode';
import path = require('path');
import fs = require('fs');
import cheerio = require("cheerio");
import { v4 as uuidv4 } from "uuid";

import * as utils from '../utils';
import * as langs from '../langs';


export class Draw {
    public static currentPanel: Draw | undefined;

    public static readonly viewType = 'draw';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    // values for editing status
    private currentEditor: vscode.TextEditor | undefined = undefined;
    private currentLine: number | undefined = 0;
    private currentText: string | undefined = "";
    private updateHandle: any = undefined;

    private updateCheckStrings = ['', ''];

    private $: any;
    private nonce = utils.nonce();

    public static createOrShow(context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (Draw.currentPanel) {
            Draw.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            Draw.viewType,
            'Draw',
            vscode.ViewColumn.Three,
            getWebviewOptions(context.extensionUri),
        );

        Draw.currentPanel = new Draw(panel, context);
    }

    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = context.extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {

                switch (message.command) {
                    case 'requestCurrentLine':
                        this.pushCurrentLine();
                        return;
                    case 'requestCustom':
                        this.pushCustom(context);
                        return;
                    case 'editCurrentLine':
                        this.setEditorText(message.text, message.control);
                        break;
                    case 'copyToClipboard':
                        vscode.env.clipboard.writeText(message.text);
                        return;
                    case 'recognize':
                        context.secrets.get("token").then((token: any) => {
                            if (Draw.currentPanel)
                                Draw.currentPanel._panel.webview.postMessage({
                                    command: 'recognize',
                                    token: token,
                                    provider: message.provider
                                });
                        });
                        return;
                }
            },
            null,
            this._disposables
        );

        this.realTimeCurrentEditorUpdate();

    }
    public dispose() {
        Draw.currentPanel = undefined;

        this._panel.dispose();

        // TODO: should include updateHandle?
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        const html = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'index.html'));
        this.$ = cheerio.load(fs.readFileSync(html.path, { encoding: 'utf8' }));
        this.$("head").append(`<meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-eval' 'nonce-${this.nonce}';">`);
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    public static revive(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        Draw.currentPanel = new Draw(panel, context);
    }

    private inject(filepath: string) {
        const toolkitUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ...[filepath]));
        let attr = "";
        switch (path.extname(filepath).substring(1)) {
            case 'css':
                this.$("head").append(`<link rel="stylesheet" nonce="${this.nonce}" href="${toolkitUri}">`);
                break;
            case 'js':
                if (filepath.includes("node_modules")) {
                    attr = `type="module"`;
                }
                this.$("body").append(`<script ${attr} nonce="${this.nonce}" src="${toolkitUri}"></script>`);
                break;
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // append script at path to the document body
        this.inject("./src/webview/style.css");
        this.inject("./src/webview/Font-Awesome-5-8-2-all-min.css");
        this.inject("./node_modules/@vscode/webview-ui-toolkit/dist/toolkit.js");
        this.inject("./node_modules/iink-js/dist/iink.min.js");
        this.inject("./src/webview/path-int.js");
        this.inject("./src/webview/main.js");
        this.inject("./src/webview/webview.js");
        this.inject("./src/webview/htr/myscript.js");
        this.inject("./src/webview/htr/mathpix.js");

        return this.$.root().html();
    }

    // get text from the editor
    private getEditorText(show: boolean) {
        let currentEditor_ = this.currentEditor;
        let currentLine_ = this.currentLine;
        const activeTextEditor = vscode.window.activeTextEditor;
        if (activeTextEditor) {
            currentEditor_ = activeTextEditor;
        }
        if (!currentEditor_ || currentEditor_.document.isClosed) {
            if (show) vscode.window.showErrorMessage('No active line');
            return {};
        }
        currentLine_ = currentEditor_.selection.active.line;

        const text = currentEditor_.document.getText(new vscode.Range(currentLine_, 0, currentLine_ + 1, 0));
        this.currentText = text;
        return { text, currentEditor_, currentLine_ };
    }

    // write text to the editor
    private pushCurrentLine() {
        const { text, currentEditor_, currentLine_ } = this.getEditorText(true);
        if (typeof text === 'string' && Draw.currentPanel) {
            this.currentEditor = currentEditor_;
            this.currentLine = currentLine_;
            Draw.currentPanel._panel.webview.postMessage({ command: 'currentLine', content: text });
        }
    }

    private resetCheckStrings(str: string) {
        this.updateCheckStrings[0] = this.updateCheckStrings[1] = str;
    }

    private realTimeCurrentEditorUpdate() {
        this.updateHandle = setInterval(() => {
            const { text, currentEditor_, currentLine_ } = this.getEditorText(false);
            if (typeof text === 'string' && Draw.currentPanel) {
                let topush = false;
                if (this.updateCheckStrings[0] !== this.updateCheckStrings[1] && text === this.updateCheckStrings[0]) {
                    topush = true;
                }
                this.updateCheckStrings[1] = this.updateCheckStrings[0];
                this.updateCheckStrings[0] = text;
                this.currentEditor = currentEditor_;
                this.currentLine = currentLine_;
                let content;
                if (utils.settings.directory) {
                    let link;
                    if (this.currentEditor)
                        link = langs.readLink(this.currentEditor.document.languageId, text);
                    if (vscode.workspace.workspaceFolders)
                        if (link) content = fs.readFileSync(path.join(vscode.workspace.workspaceFolders[0].uri.path, link), { encoding: 'utf-8' });
                }
                if (topush) {
                    Draw.currentPanel._panel.webview.postMessage({ command: 'currentLine', content: content || text });
                }
            }
        }, 100);
    }


    private setEditorText(text: string, control: number) {
        if (utils.settings.directory && !text.startsWith("$$")) {
            let filename = `${uuidv4()}.svg`;
            let alt = "";

            // reuse existing alt and filename, if available
            let match;
            if (this.currentText)
                match = this.currentText.match(/!\[(.*)\]\((.*\.svg)\)/);
            if (match) {
                alt = match[1];
                filename = path.basename(match[2]);
            }

            if (this.currentEditor) {

                let name;
                if (text)
                    name = utils.write(text, filename);
                if (name)
                    text = langs.createLink(this.currentEditor.document.languageId, name, alt) || "";

            }
        }

        if (!this.currentEditor || this.currentEditor.document.isClosed) {
            vscode.window.showErrorMessage('The text editor has been closed');
            return;
        }

        let p;
        if (this.currentLine) {
            p = vscode.window.showTextDocument(this.currentEditor.document, {
                viewColumn: this.currentEditor.viewColumn,
                selection: new vscode.Range(this.currentLine, 0, this.currentLine, 0)
            }).then((editor) => editor.edit(edit => {
                if (this.currentLine)
                    edit.replace(new vscode.Range(this.currentLine, 0, this.currentLine + 1, 0), text + '\n');
                this.resetCheckStrings(text.split('\n')[0] + '\n');
            }));
        }

        if (control !== 0 && p) {
            p = p.then(() => {
                if (this.currentEditor && this.currentLine)
                    vscode.window.showTextDocument(this.currentEditor.document, {
                        viewColumn: this.currentEditor.viewColumn,
                        selection: new vscode.Range(this.currentLine + control, 0, this.currentLine + control, 0)
                    });
            }).then(() => {
                this.pushCurrentLine();
            });
        }
    }

    // add custom buttons to the toolbar
    private pushCustom(context: vscode.ExtensionContext) {
        let buttons = utils.settings['buttons'];
        context.secrets.get("provider").then((provider: string | undefined) => {
            if (provider) {
                buttons = [{
                    icon: "square-root-alt",
                    title: "recognize to latex",
                    function: `window.drawAPI.unstable.recognize("${provider}")`
                }].concat(buttons);
            }

            Draw.currentPanel?._panel.webview.postMessage({
                command: 'customButtons',
                content: buttons
            });
        });
    }


}

export function getWebviewOptions(extensionUri: vscode.Uri) {
    return {
        enableScripts: true,
        // TODO: more secure and required for restore over extension updates
        // localResourceRoots: ['webview', 'node_modules'].map((i) => { vscode.Uri.joinPath(extensionUri, i) })
    };
}

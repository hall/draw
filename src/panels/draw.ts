import * as vscode from 'vscode';
import path = require('path');
import fs = require('fs');
import cheerio = require("cheerio");

import * as langs from '../langs';


export class Draw {
    public static currentPanel: Draw | undefined;

    public static readonly viewType = 'draw';
    public static settings = vscode.workspace.getConfiguration(Draw.viewType);

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
    private nonce = nonce();

    /**
     * create a new panel, or show the existing one, if available
     * @param context the current extention context
     */
    public static createOrShow(context: vscode.ExtensionContext): void {

        // If we already have a panel, show it.
        if (Draw.currentPanel) {
            const column = vscode.window?.activeTextEditor?.viewColumn || undefined;
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
                    case 'recognize':
                        context.secrets.get("token").then((token: any) => {
                            Draw.currentPanel?._panel.webview.postMessage({
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

    /**
     * remove the panel and dispose of its objects
     */
    public dispose(): void {
        Draw.currentPanel = undefined;
        this._panel.dispose();

        // TODO: should include updateHandle?
        while (this._disposables.length) {
            this._disposables.pop()?.dispose();
        }
    }

    /**
     * update the webview contents
     */
    private _update() {
        // get the webview index
        const html = path.resolve(this._extensionUri.fsPath, 'src', 'webview', 'index.html');

        // load it into the fake dom
        this.$ = cheerio.load(fs.readFileSync(html, { encoding: 'utf8' }));

        this.$("head").append(`<meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-eval' 'nonce-${this.nonce}';">`);

        this.inject("node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js");
        this.inject("node_modules", "iink-js", "dist", "iink.min.js");
        this.inject("src", "webview");

        this._panel.webview.html = this.$.root().html();
    }

    /**
     * recreate the panel
     * @param panel
     * @param context 
     */
    public static revive(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        Draw.currentPanel = new Draw(panel, context);
    }

    /**
     * inject the contents at filepath into the dom
     * @param filepath 
     */
    private inject(...filepath: string[]): void {
        const absPath = path.resolve(this._extensionUri.fsPath, ...filepath);
        if (fs.lstatSync(absPath).isDirectory()) {
            [...fs.readdirSync(absPath)].sort().forEach(p => this.inject(path.join(...filepath, p)));
            return;
        }

        const toolkitUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ...filepath));
        let attr = "";
        switch (path.extname(path.join(...filepath)).substring(1)) {
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

    /**
     * get text from the editor
     * @param show true if an error message should be displayed on error
     * @returns 
     */
    private getEditorText(show: boolean) { //: { text: string, currentEditor_: vscode.TextEditor, currentLine_: number } {
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

    /**
     * start an update loop to continuously update the editor
     */
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
                if (Draw.settings.directory) {
                    const link = langs.readLink(this.currentEditor?.document.languageId || "markdown", text);
                    if (link && link.filename) content = fs.readFileSync(link.filename, { encoding: 'utf-8' });
                }
                if (topush) {
                    if (this.currentEditor)
                        if (langs.readLink(this.currentEditor.document.languageId, text) || text?.startsWith("<svg")) {
                            Draw.currentPanel._panel.webview.postMessage({ command: 'currentLine', content: content || text });
                        }
                }
            }
        }, 100);
    }


    /**
     *  write text to current editor's cursor position control
     */
    private setEditorText(text: string, control: number): void {

        if (!this.currentEditor || this.currentEditor.document.isClosed) {
            vscode.window.showErrorMessage('The text editor has been closed');
            return;
        }

        // if a directory is set and current line is not latex, set the text to a link
        if (Draw.settings.directory && !text.startsWith("$$")) {
            text = langs.createLink(this.currentEditor, text);
        }

        let p;
        if (this.currentLine !== undefined) {
            p = vscode.window.showTextDocument(this.currentEditor.document, {
                viewColumn: this.currentEditor.viewColumn,
                selection: new vscode.Range(this.currentLine, 0, this.currentLine, 0)
            }).then((editor) => editor.edit(edit => {
                if (this.currentLine !== undefined)
                    edit.replace(new vscode.Range(this.currentLine, 0, this.currentLine + 1, 0), text + '\n');
                this.updateCheckStrings[0] = this.updateCheckStrings[1] = text.split('\n')[0] + '\n';
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

    /**
     * add custom buttons to the toolbar
     * @param context the current extension context
     */
    private pushCustom(context: vscode.ExtensionContext): void {
        let buttons = Draw.settings['buttons'];
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

/**
 * get options for webview panel
 * @param extensionUri the current extensions URI
 * @returns a set of webview options
 */
export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
        enableScripts: true,
        localResourceRoots: ['src/webview', 'node_modules'].map((i) => vscode.Uri.joinPath(extensionUri, i))
    };
}


// generate a nonce
function nonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
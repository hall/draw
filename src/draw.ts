import * as vscode from 'vscode';

import * as langs from './langs';
import html from '../webview/index.html';
import * as pkg from '../package.json';

type Target = {
    /** the target editor for modification */
    editor: vscode.TextEditor | undefined;
    /** the current line number in the target editor */
    line: number | undefined;
    /** the text on the targetLine of the targetEditor */
    text: string | undefined;
};

export class Draw {
    /** singleton of the currently open panel */
    public static panel: vscode.WebviewPanel | undefined;

    /** id which defines the webPanel view type */
    public static readonly viewType = pkg.name;

    /** user-provided settings */
    public static settings = vscode.workspace.getConfiguration(Draw.viewType);

    /** a list of disposable objects */
    private _disposables: vscode.Disposable[] = [];

    /** the target editor */
    private target: Target = {
        editor: undefined,
        line: undefined,
        text: undefined
    };

    /** store the current and previous line for comparison  */
    private check = ['', ''];


    /**
     * create a new panel, or show the existing one, if available
     * @param context the current extension context
     */
    public constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel | undefined = undefined) {
        // if we already have a panel, just show it
        if (Draw.panel) {
            Draw.panel.reveal(vscode.window?.activeTextEditor?.viewColumn);
            return;
        }

        // use the panel given, if any (e.g., during a state restore)
        // otherwise, create a new panel
        Draw.panel = panel ?? vscode.window.createWebviewPanel(
            Draw.viewType,
            pkg.displayName,
            vscode.ViewColumn.Three,
            getWebviewOptions(context.extensionUri)
        );

        Draw.configure(context);

        // Set the webview's initial html content
        Draw.panel.webview.html = html;

        // listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        Draw.panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // listen for messages from the webview process
        Draw.panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'requestCurrentLine':
                    this.pushCurrentLine();
                    return;
                case 'requestCustom':
                    this.pushCustom(context);
                    return;
                case 'editCurrentLine':
                    this.setEditorText(message.text, message.control);
                    return;
                case 'recognize':
                    context.secrets.get("token").then((token: any) => {
                        Draw.panel?.webview.postMessage({
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
     * (re-)configure panel settings
     */
    public static configure(context: vscode.ExtensionContext) {
        context.secrets.get("provider").then((provider: any) => {
            if (provider !== undefined) {
                Draw.panel?.webview.postMessage({
                    command: 'providerConfigured',
                    provider: provider
                });
            }
        });
    }

    /**
     * remove the panel and dispose of its objects
     */
    public dispose(): void {
        Draw.panel?.dispose();
        Draw.panel = undefined;

        while (this._disposables.length) {
            this._disposables.pop()?.dispose();
        }
    }

    /**
     * get the target editor
     */
    private getTarget(): Target | undefined {
        const editor = vscode.window.activeTextEditor ?? this.target.editor;
        const line = editor?.selection.active.line ?? this.target.line;

        if (!editor || editor.document.isClosed) {
            this.setState();
            return undefined;
        }

        let text;
        if (line !== undefined) {
            text = this.target.text = editor.document.getText(new vscode.Range(line, 0, line + 1, 0));
        }
        return { editor, line, text };
    }

    /**
     * Copy svg back to editor
     */
    private pushCurrentLine(): void {
        const target = this.getTarget();
        if (typeof target?.text === 'string' && Draw.panel) {
            this.target = target;
            this.setState();
            Draw.panel.webview.postMessage({ command: 'currentLine', content: target.text });
        }
    }

    /**
     * disable the panel's interactions with the editor
     *
     * This is generally done when either there is no active editor or the
     * correct one is ambiguous.
     */
    public setState(): void {
        let state = "enabled";
        if (!this.target.editor || this.target.editor.document.isClosed) {
            state = "disabled";
        }
        Draw.panel?.webview.postMessage({ command: "setState", state: state });
    }

    /**
     * start an update loop to continuously update the canvas
     */
    private realTimeCurrentEditorUpdate() {
        setInterval(() => {
            const target = this.getTarget();
            if (typeof target?.text !== 'string') return;
            let push = false;
            if (this.check[0] !== this.check[1] && target.text === this.check[0]) {
                push = true;
            }


            this.check[1] = this.check[0];
            this.check[0] = target?.text || '';

            this.target = target;
            this.setState();

            if (Draw.settings.directory) {
                const link = langs.readLink(this.target.editor?.document.languageId || "markdown", target.text);
                const paths = this.target.editor?.document.uri.path.split("/");
                if (link && paths) {
                    paths.pop();
                    link.filename = vscode.Uri.joinPath(vscode.Uri.file(paths.join("/")), link.filename).path;
                }
                if (link?.filename) {
                    vscode.workspace.fs.readFile(vscode.Uri.file(link.filename)).then((c) => {
                        target.text = Buffer.from(c).toString();
                        if (push) Draw.panel?.webview.postMessage({ command: 'currentLine', content: target.text });
                    });
                }
            } else {
                // text is probably an svg element
                if (target.text.startsWith("<svg")) {

                    if (this.target.editor && (this.check[0] !== this.check[1]) && (target.text === this.check[0])) {
                        if (push) Draw.panel?.webview.postMessage({ command: 'currentLine', content: target.text });
                    }

                }
            }
        }, 100);
    }


    /**
     *  write text to current editor's cursor position control
     */
    private setEditorText(text: string, control: number): void {

        // the save button _should_ be disabled if there's no active editor
        // but let's check and show an error message anyway, just in case
        if (!this.target.editor || this.target.editor.document.isClosed) {
            vscode.window.showErrorMessage('The text editor has been closed');
            return;
        }

        // if a directory is set, and current line is not latex, replace the text with a link
        if (Draw.settings.directory && Draw.settings.directory !== "" && !text.startsWith("$$")) {
            text = langs.createLink(this.target.editor, text);
        }

        if (this.target.line !== undefined) {
            vscode.window.showTextDocument(this.target.editor.document, {
                viewColumn: this.target.editor.viewColumn,
            }).then(editor => {
                editor.edit(edit => {
                    if (this.target.line !== undefined)
                        edit.replace(new vscode.Range(this.target.line, 0, this.target.line + 1, 0), text);
                    this.check[0] = this.check[1] = text;
                });
            }).then(() => {
                vscode.commands.executeCommand('cursorMove', { to: "wrappedLineStart" });
            }).then(() => {
                if (control !== 0 && this.target.editor && this.target.line)
                    vscode.window.showTextDocument(this.target.editor.document, {
                        viewColumn: this.target.editor.viewColumn,
                        selection: new vscode.Range(this.target.line + control, 0, this.target.line + control, 0)
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

            Draw.panel?.webview.postMessage({
                command: 'customButtons',
                content: buttons
            });
        });
    }

    /**
     * temp? function to post a message to the webview
     * @param any 
     */
    public message(any: any) {
        Draw.panel?.webview.postMessage(any);
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
        localResourceRoots: []
    };
}

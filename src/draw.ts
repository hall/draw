import * as vscode from 'vscode';

import * as langs from './langs';
import html from '../webview/index.html';

export class Draw {
    /** singleton of the currently open panel */
    public static currentPanel: Draw | undefined;

    /** id which defines the webpanel view type */
    public static readonly viewType = 'draw';

    /** user-provided settings */
    public static settings = vscode.workspace.getConfiguration(Draw.viewType);

    /** the webview panel object */
    private readonly _panel: vscode.WebviewPanel;
    /** the current extension uri */
    private readonly _extensionUri: vscode.Uri;
    /** a list of disposable objects */
    private _disposables: vscode.Disposable[] = [];

    /** the target editor for modification */
    private currentEditor: vscode.TextEditor | undefined = undefined;
    /** the current line number in the target editor */
    private currentLine: number | undefined = 0;
    /** the text on the currentLine of the currentEditor */
    private currentText: string | undefined = "";
    private updateHandle: any = undefined;

    private updateCheckStrings = ['', ''];

    /** a pseudo-randomly generated value */
    private nonce = nonce();

    /**
     * create a new panel, or show the existing one, if available
     * @param context the current extension context
     */
    public static createOrShow(context: vscode.ExtensionContext): void {

        // If we already have a panel, show it.
        if (Draw.currentPanel) {
            Draw.currentPanel._panel.reveal(vscode.window?.activeTextEditor?.viewColumn);
            return;
        }

        // Otherwise, create a new panel.
        Draw.currentPanel = new Draw(vscode.window.createWebviewPanel(
            Draw.viewType, 'Draw', vscode.ViewColumn.Three,
            getWebviewOptions(context.extensionUri)), context);
    }

    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = context.extensionUri;

        // Set the webview's initial html content
        this._panel.webview.html = html;

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(message => {
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
     * recreate the panel
     * @param panel
     * @param context 
     */
    public static revive(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        Draw.currentPanel = new Draw(panel, context);
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
            Draw.currentPanel?.setState();
            // if (show) vscode.window.showErrorMessage('No active line');
            return {};
        }
        currentLine_ = currentEditor_.selection.active.line;

        const text = currentEditor_.document.getText(new vscode.Range(currentLine_, 0, currentLine_ + 1, 0));
        this.currentText = text;
        return { text, currentEditor_, currentLine_ };
    }

    /**
     * Copy svg back to editor
     */
    private pushCurrentLine(): void {
        const { text, currentEditor_, currentLine_ } = this.getEditorText(true);
        if (typeof text === 'string' && Draw.currentPanel) {
            this.currentEditor = currentEditor_;
            this.setState();
            this.currentLine = currentLine_;
            Draw.currentPanel._panel.webview.postMessage({ command: 'currentLine', content: text });
        }
    }

    /**
     * disable the panel's interactions with the editor
     *
     * This is generally done when either there is no active editor or the
     * correct one is ambiguous.
     */
    public setState(): void {
        if (!this.currentEditor || this.currentEditor.document.isClosed) {
            Draw.currentPanel?._panel.webview.postMessage({ command: "setState", state: "disabled" });
        } else {
            Draw.currentPanel?._panel.webview.postMessage({ command: "setState", state: "enabled" });
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
                this.setState();
                this.currentLine = currentLine_;
                let content;
                if (Draw.settings.directory) {
                    const link = langs.readLink(this.currentEditor?.document.languageId || "markdown", text);
                    if (link?.filename && vscode.workspace.workspaceFolders) {
                        vscode.workspace.fs.readFile(vscode.Uri.file(link.filename)).then((c) => {
                            content = Buffer.from(c).toString();
                            if (topush && this.currentEditor)
                                if (link || text?.startsWith("<svg")) {
                                    Draw.currentPanel?._panel.webview.postMessage({ command: 'currentLine', content: content || text });
                                }
                        });
                    }
                } else if (topush && this.currentEditor)
                    if (text?.startsWith("<svg")) {
                        Draw.currentPanel?._panel.webview.postMessage({ command: 'currentLine', content: content || text });
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
        localResourceRoots: []
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
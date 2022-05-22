import fs = require("fs");
import path = require("path");
import vscode = require("vscode");

const settings = vscode.workspace.getConfiguration('draw');
export { settings };

// generate a nonce
export function nonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// write text to filename
export function write(text: string, filename: string) {
    let root = "";
    if (vscode.workspace.workspaceFolders) {
        root = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }

    const dir = path.join(root, settings.directory || "");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    fs.writeFileSync(path.join(dir, filename), text, { encoding: 'utf8' });

    // relative path
    return path.join(settings.directory || "", filename);
}

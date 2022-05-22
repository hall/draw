const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

let settings = vscode.workspace.getConfiguration('draw');
exports.settings = settings

// generate a nonce
exports.nonce = function () {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// swap elements a and b
Array.prototype.swap = function (a, b) {
    this[a] = this.splice(b, 1, this[a])[0]
    return this
}


// write text to filename
exports.write = function (text, filename) {
    let dir = path.join(vscode.workspace.rootPath, settings.directory || "")
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    fs.writeFileSync(path.join(dir, filename), text, { encoding: 'utf8' });

    // relative path
    return path.join(settings.directory || "", filename)
}

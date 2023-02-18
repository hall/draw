import * as vscode from "vscode";
import { Draw } from './draw';

/**
 * return a formatted link to a file (relative to the current
 * editor) with a randomly-generated UUID filename
 * @param editor the text editor to create the link path in relation to
 * @param text the content to write to a file
 */
export function createLink(editor: vscode.TextEditor, text: string): string {

    // defaults
    let uri = vscode.Uri.file(`${uuidv4()}.svg`);
    let alt = "";

    // create variables for replacement
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;

    // replace supported variables
    let directory = Draw.settings.directory.replace('${workspaceFolder}', workspaceFolder)

    // if not an absolute path, prepend current directory
    if (!directory.startsWith("/")) {
        // get path to current file
        const fsPath = editor.document.uri.fsPath;
        // get directory of said file
        const fileDirname = fsPath.slice(0, fsPath.lastIndexOf("/"));
        // prepend directory to setting
        directory = vscode.Uri.joinPath(vscode.Uri.file(fileDirname) || vscode.Uri.file(""), directory).path;
    }

    // create the directory, if necessary
    if (!vscode.Uri.file(directory)) {
        vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // reuse existing alt and filename, if available
    const current = editor.document.lineAt(editor.selection.active.line).text;
    const match = readLink(editor.document.languageId, current);
    if (match) {
        alt = match["alt"];
        const paths = vscode.Uri.file(match["filename"]).path.split("/");
        uri = vscode.Uri.file(paths[paths.length - 1]);
    }

    // write contents to absolute path {settings}/{filename}
    vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.Uri.file(directory), uri.path), Buffer.from(text));

    // prepend absolute path to settings directory to filename
    uri = vscode.Uri.joinPath(vscode.Uri.file(directory), uri.path);

    // get relative path from editor to settings directory
    const filename = scoped(editor.document.uri, uri).fsPath.substring(1);

    // https://hyperpolyglot.org/lightweight-markup
    switch (editor.document.languageId) {

        case 'asciidoc':
            return `image::${filename}[${alt}]`;

        case 'restructuredtext':
            return `.. image:: ${filename}`; // TODO: add alt text `\n   :alt: ${alt}`

        case 'markdown':
        default:
            return `![${alt}](${filename})`;

        // case 'mediawiki':
        //   return `[[File:${filename}|alt=${alt}]]`

        // case 'org':
        //   return `[[${filename}]]`

    }
}

/**
 * return alt text and filename from link in markup language format
 * @param language a string which identifies the document's format (e.g., `markdown`)
 * @param link the full text of the link itself
 * @returns absolute path to file, and alt text string
 */
export function readLink(language: string, link: string): {
    alt: string, filename: string
} | undefined {
    let match;

    // https://hyperpolyglot.org/lightweight-markup
    switch (language) {

        case 'asciidoc':
            match = link.match(/image::(.*)\[(.*)\]/);
            if (match) [match[1], match[2]] = [match[2], match[1]];
            break;

        case 'restructuredtext':
            // TODO: support multiline text for alt
            match = link.match(/..() image:: (.*)/);
            break;

        case 'markdown':
        default:
            match = link.match(/!\[(.*)\]\((.*)\)/);
            break;

        // case 'mediawiki':
        //   match = link.match()
        //   break

        // case 'org':
        //   match = link.match()
        //   break
    }

    if (match && match?.length > 1 && vscode.window.activeTextEditor) {
        return { alt: match[1], filename: match[2] };
    }

    return undefined;
}

/**
 * Generate a random-enough UUID
 * 
 * To support running in the browser, we cannot rely on node's crypto library.
 * 
 * @returns a UUID-like string
 */
function uuidv4(): string {
    const S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

/**
 * Get a uri between two files, scoped to the workspace root.
 * 
 * @param from absolute uri to start file
 * @param to absolute uri to destination file
 * @returns uri from start file to destination file
 */
function scoped(from: vscode.Uri, to: vscode.Uri): vscode.Uri {
    // /full/path/to/assets/xxxx.svg
    const toPaths = to.path.substring(1).split("/");
    // /full/path/to/file/in/workspace/xxx.md
    const fromPaths = from.path.substring(1).split("/");

    const relativePaths: string[] = [];

    let shared = 0;
    fromPaths.forEach((path, index) => {
        // remove common parents
        if (toPaths[index] == path) {
            shared++;
            return;
        }

        if (index > shared) relativePaths.push("..");
    });

    return vscode.Uri.file(relativePaths.concat(toPaths.slice(shared)).join("/"));
}

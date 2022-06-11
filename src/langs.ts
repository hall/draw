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
    let filename = `${uuidv4()}.svg`;
    let alt = "";

    let settings = Draw.settings.directory;
    if (vscode.workspace.workspaceFolders) {
        // prepend workspace folder to settings directory
        settings = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, settings).path;

        // TODO: maybe a bug but this var is prefixed with an errant \ on win
        while (settings.charAt(0) === '\\') settings = settings.substring(1);
    }

    // create the directory, if necessary
    if (!vscode.Uri.file(settings)) {
        vscode.workspace.fs.createDirectory(vscode.Uri.file(settings));
    }

    // reuse existing alt and filename, if available
    const current = editor.document.lineAt(editor.selection.active.line).text;
    const match = readLink(editor.document.languageId, current);
    if (match) {
        alt = match["alt"];
        const paths = vscode.Uri.file(match["filename"]).path.split("/");
        filename = paths[paths.length - 1];
    }

    // write contents to absolute path {settings}/{filename}
    vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.Uri.file(settings), filename), Buffer.from(text));

    // prepend absolute path to settings directory to filename
    filename = vscode.Uri.joinPath(vscode.Uri.file(settings), filename).path;

    // get relative path from editor to settings directory
    filename = relative(editor.document.fileName, filename);

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
 * Get path between two files, relative to the workspace root.
 * 
 * @param from absolute path to start file
 * @param to absolute path to destination file
 * @returns relative path from start file to destination file
 */
function relative(from: string, to: string): string {
    // /full/path/to/assets/xxxx.svg
    const toPaths = to.substring(1).split("/");
    // /full/path/to/file/in/workspace/xxx.md
    const fromPaths = from.substring(1).split("/");

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


    return relativePaths.concat(toPaths.slice(shared)).join("/");
}

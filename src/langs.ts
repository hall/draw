import * as vscode from "vscode";

const draw = vscode.workspace.getConfiguration("draw");

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
    let link: string;

    // reuse existing alt and filename, if available
    const match = readLink(editor.document.languageId, text);
    if (match) {
        alt = match["alt"];
        const paths = vscode.Uri.file(match["filename"]).path.split("/");
        filename = paths[paths.length - 1];
    } else {

        // path to file, start at current editor's directory
        const paths = vscode.Uri.file(editor.document.fileName).path.split("/");
        paths.pop();
        const filepath = paths.join("/");

        if (vscode.workspace.workspaceFolders) {
            // get the fullpath to the settings directory
            let settings = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, draw.directory).path;


            // TODO: maybe a bug but this var is prefixed with an errant \ on win
            while (settings.charAt(0) === '\\') settings = settings.substring(1);

            // create the directory, if necessary
            if (!vscode.Uri.file(settings)) {
                vscode.workspace.fs.createDirectory(vscode.Uri.file(settings));
            }

            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.Uri.file(settings), filename), Buffer.from(text));

            // prepend settings directory to filename
            filename = vscode.workspace.asRelativePath(vscode.Uri.joinPath(vscode.Uri.file(settings), filename));

            // get relative path from editor to settings directory
            filename = relative(vscode.workspace.asRelativePath(vscode.window.activeTextEditor?.document.fileName || ""), filename);
        }
    }

    // https://hyperpolyglot.org/lightweight-markup
    switch (editor.document.languageId) {

        case 'asciidoc':
            link = `image::${filename}[${alt}]`;
            break;

        case 'restructuredtext':
            link = `.. image:: ${filename}`; // TODO: add alt text `\n   :alt: ${alt}`
            break;

        case 'markdown':
        default:
            link = `![${alt}](${filename})`;
            break;

        // case 'mediawiki':
        //   return `[[File:${filename}|alt=${alt}]]`

        // case 'org':
        //   return `[[${filename}]]`

    }


    return link;
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
        const paths = vscode.window.activeTextEditor.document.uri.path.split("/");
        paths.pop();
        match[2] = vscode.Uri.joinPath(vscode.Uri.file(paths.join("/")), match[2]).path;
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
 * @param to destination file
 * @param from start file
 * @returns relative path from start file to destination file
 */
function relative(from: string, to: string): string {
    // assets/xxxx.svg
    const toPaths = to.split("/");
    // one/two/three/xxx.svg
    const fromPaths = from.split("/");
    const relativePaths: string[] = [];

    let shared = 0;
    fromPaths.forEach((path, index) => {
        // remove common parents
        if (toPaths[index] == fromPaths[index]) {
            toPaths.shift();
            shared++;
            return;
        }

        if (index > shared)
            relativePaths.push("..");
    });

    return relativePaths.concat(toPaths).join("/");
}

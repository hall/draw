import path = require('path');
import fs = require('fs');
import vscode = require("vscode");
import { v4 as uuidv4 } from "uuid";

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
        filename = path.basename(match["filename"]);
    }

    // path to file, start at current editor's directory
    let filepath = path.dirname(editor.document.fileName);


    if (vscode.workspace.workspaceFolders) {
        // get the fullpath to the settings directory
        let settings = path.join(vscode.workspace.workspaceFolders[0].uri.path, draw.directory);


        // TODO: maybe a bug but this var is prefixed with an errant \ on win
        while (settings.charAt(0) === '\\') settings = settings.substring(1);

        // create the directory, if necessary
        if (!fs.existsSync(settings)) {
            fs.mkdirSync(settings, { recursive: true });
        }

        fs.writeFileSync(path.resolve(settings, filename), text, { encoding: 'utf8' });

        // get relative path from editor to settings directory
        filepath = path.relative(filepath, settings);
    }

    // append filename to relative path
    filename = path.join(filepath, filename);

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
        match[2] = path.resolve(path.dirname(vscode.window.activeTextEditor.document?.fileName), match[2]);
        return { alt: match[1], filename: match[2] };
    }

    return undefined;
}

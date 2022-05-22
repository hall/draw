import vscode = require("vscode");
import path = require("path");
import fs = require("fs");
import { v4 as uuidv4 } from "uuid";
import cheerio = require("cheerio");

import htr = require("./htr");
import utils = require("./utils");
import langs = require("./langs");

let $: any;
const nonce = utils.nonce();

/** @param {vscode.ExtensionContext} context */
export function activate(context: vscode.ExtensionContext) {

  // values for webview status
  let currentPanel: vscode.WebviewPanel | undefined = undefined;

  // values for editing status
  let currentEditor: vscode.TextEditor | undefined = undefined;
  let currentLine: number | undefined = 0;
  let currentText: string | undefined = "";
  let updateHandle: any = undefined;

  function createNewPanel() {
    // Create and show panel
    currentPanel = vscode.window.createWebviewPanel(
      'drawNote',
      'Draw',
      vscode.ViewColumn.Three,
      getWebviewOptions(context.extensionUri)
    );
    const html = currentPanel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'index.html'));
    // load root webview document
    $ = cheerio.load(fs.readFileSync(html.path, { encoding: 'utf8' }));

    $("head").append(`<meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-eval' 'nonce-${nonce}';">`);


    currentPanel.webview.html = getWebviewContent(context, currentPanel) || "";

    // Handle messages from the webview
    currentPanel.webview.onDidReceiveMessage(
      message => {

        switch (message.command) {
          case 'requestCurrentLine':
            pushCurrentLine();
            return;
          case 'requestCustom':
            pushCustom();
            return;
          case 'editCurrentLine':
            setEditorText(message.text, message.control);
            break;
          case 'copyToClipboard':
            vscode.env.clipboard.writeText(message.text);
            return;
          case 'recognize':
            context.secrets.get("token").then((token) => {
              if (currentPanel)
                currentPanel.webview.postMessage({
                  command: 'recognize',
                  token: token,
                  provider: message.provider
                });
            });
            return;
        }
      },
      undefined,
      context.subscriptions
    );

    realTimeCurrentEditorUpdate();

    currentPanel.onDidDispose(
      () => {
        if (updateHandle != undefined) {
          clearInterval(updateHandle);
          updateHandle = undefined;
        }
        currentPanel = undefined;
      },
      undefined,
      context.subscriptions
    );
  }

  function getEditorText(show: boolean) {
    let currentEditor_ = currentEditor;
    let currentLine_ = currentLine;
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
    currentText = text;
    return { text, currentEditor_, currentLine_ };
  }

  function pushCurrentLine() {
    const { text, currentEditor_, currentLine_ } = getEditorText(true);
    if (typeof text === 'string' && currentPanel) {
      currentEditor = currentEditor_;
      currentLine = currentLine_;
      currentPanel.webview.postMessage({ command: 'currentLine', content: text });
    }
  }

  const updateCheckStrings = ['', ''];
  function resetCheckStrings(str: string) {
    updateCheckStrings[0] = updateCheckStrings[1] = str;
  }

  function realTimeCurrentEditorUpdate() {
    updateHandle = setInterval(() => {
      const { text, currentEditor_, currentLine_ } = getEditorText(false);
      if (typeof text === 'string' && currentPanel) {
        let topush = false;
        if (updateCheckStrings[0] !== updateCheckStrings[1] && text === updateCheckStrings[0]) {
          topush = true;
        }
        updateCheckStrings[1] = updateCheckStrings[0];
        updateCheckStrings[0] = text;
        currentEditor = currentEditor_;
        currentLine = currentLine_;
        let content;
        if (utils.settings.directory) {
          let link;
          if (currentEditor)
            link = langs.readLink(currentEditor.document.languageId, text);
          if (vscode.workspace.workspaceFolders)
            if (link) content = fs.readFileSync(path.join(vscode.workspace.workspaceFolders[0].uri.path, link), { encoding: 'utf-8' });
        }
        if (topush) {
          currentPanel.webview.postMessage({ command: 'currentLine', content: content || text });
        }
      }
    }, 100);
  }


  function setEditorText(text: string, control: number) {
    if (utils.settings.directory && !text.startsWith("$$")) {
      let filename = `${uuidv4()}.svg`;
      let alt = "";

      // reuse existing alt and filename, if available
      let match;
      if (currentText)
        match = currentText.match(/!\[(.*)\]\((.*\.svg)\)/);
      if (match) {
        alt = match[1];
        filename = path.basename(match[2]);
      }

      if (currentEditor) {

        let name;
        if (text)
          name = utils.write(text, filename);
        if (name)
          text = langs.createLink(currentEditor.document.languageId, name, alt) || "";

      }
    }

    if (!currentEditor || currentEditor.document.isClosed) {
      vscode.window.showErrorMessage('The text editor has been closed');
      return;
    }

    let p;
    if (currentLine) {
      p = vscode.window.showTextDocument(currentEditor.document, {
        viewColumn: currentEditor.viewColumn,
        selection: new vscode.Range(currentLine, 0, currentLine, 0)
      }).then((editor) => editor.edit(edit => {
        if (currentLine)
          edit.replace(new vscode.Range(currentLine, 0, currentLine + 1, 0), text + '\n');
        resetCheckStrings(text.split('\n')[0] + '\n');
      }));
    }

    if (control !== 0 && p) {
      p = p.then(() => {
        if (currentEditor && currentLine)
          vscode.window.showTextDocument(currentEditor.document, {
            viewColumn: currentEditor.viewColumn,
            selection: new vscode.Range(currentLine + control, 0, currentLine + control, 0)
          });
      }).then(() => {
        pushCurrentLine();
      });
    }
  }

  function pushCustom() {
    let buttons = utils.settings['buttons'];
    context.secrets.get("provider").then((provider) => {
      if (provider) {
        buttons = [{
          icon: "square-root-alt",
          title: "recognize to latex",
          function: `window.drawAPI.unstable.recognize("${provider}")`
        }].concat(buttons);
      }

      currentPanel?.webview.postMessage({
        command: 'customButtons',
        content: buttons
      });
    });
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('draw.editCurrentLineAsSVG', () => {
      if (currentPanel) {
        currentPanel.reveal();
        pushCurrentLine();
      } else {
        vscode.commands.executeCommand('workbench.action.editorLayoutTwoRowsRight').then(() => {
          createNewPanel();
          pushCurrentLine();
        });
      }
    }),
    vscode.commands.registerCommand('draw.configureHTR', () => {
      htr.init(context);
    })
  );

  if (vscode.window.registerWebviewPanelSerializer) {
    vscode.window.registerWebviewPanelSerializer('drawPanel', {
      async deserializeWebviewPanel(webviewPanel, state) {
        console.log(`Got state: ${state}`);
        // CatCodingPanel.revive(webviewPanel, context.extensionUri);
        webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
        createNewPanel();
        pushCurrentLine();
        // webviewPanel.webview.html = 
      }
    });
  }

}

function getWebviewOptions(extensionUri: vscode.Uri) {
  return {
    enableScripts: true,
    // TODO: more secure and required for restore over extension updates
    // localResourceRoots: ['webview', 'node_modules'].map((i) => { vscode.Uri.joinPath(extensionUri, i) })
  };
}


function getWebviewContent(context: vscode.ExtensionContext, currentPanel: vscode.WebviewPanel) {
  // append script at path to the document body
  function inject(filepath: string) {
    const toolkitUri = currentPanel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, ...[filepath]));
    let attr = "";
    switch (path.extname(filepath).substring(1)) {
      case 'css':
        $("head").append(`<link rel="stylesheet" nonce="${nonce}" href="${toolkitUri}">`);
        break;
      case 'js':
        if (filepath.includes("node_modules")) {
          attr = `type="module"`;
        }
        $("body").append(`<script ${attr} nonce="${nonce}" src="${toolkitUri}"></script>`);
        break;
    }
  }

  inject("./src/webview/style.css");
  inject("./src/webview/Font-Awesome-5-8-2-all-min.css");
  inject("./node_modules/@vscode/webview-ui-toolkit/dist/toolkit.js");
  inject("./node_modules/iink-js/dist/iink.min.js");
  inject("./src/webview/path-int.js");
  inject("./src/webview/main.js");
  inject("./src/webview/webview.js");
  inject("./src/webview/htr/myscript.js");
  inject("./src/webview/htr/mathpix.js");

  return $.root().html()?.replace(/ToBeReplacedByRandomToken/g, nonce);
}

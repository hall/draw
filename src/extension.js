const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require('uuid');
const cheerio = require("cheerio");
var Walk = require("@root/walk");

const htr = require("./htr.js");
const utils = require("./utils.js");
const langs = require("./langs.js");

// load root webview document
var $ = cheerio.load(fs.readFileSync(path.join(__dirname, 'webview.html'), { encoding: 'utf8' }))

let settings = vscode.workspace.getConfiguration('draw');

// inject js/css into base html document
function loadWebviewFiles(err, pathname, dirent) {
  if (dirent.isDirectory()) return Promise.resolve();

  let content = fs.readFileSync(pathname)
  switch (path.extname(pathname).substring(1)) {
    case 'css':
      $("head").append('<style>' + content + '</style>')
      break;
    case 'js':
      $("body").append('<script nonce="ToBeReplacedByRandomToken">' + content + '</script>')
      break;
  }
  return Promise.resolve();
}

Walk.walk(path.join(__dirname, "webview"), loadWebviewFiles).then(function () { });

/** @param {vscode.ExtensionContext} context */
exports.activate = function (context) {

  // values for webview status
  /** @type {vscode.WebviewPanel | undefined} */
  let currentPanel = undefined;

  // values for editing status
  /** @type {vscode.TextEditor | undefined} */
  let currentEditor = undefined;
  let currentLine = 0;
  let currentText = "";
  let updateHandle = undefined;

  function createNewPanel() {
    // Create and show panel
    currentPanel = vscode.window.createWebviewPanel(
      'drawNote',
      'Draw',
      vscode.ViewColumn.Three,
      {
        // Enable scripts in the webview
        enableScripts: true
      }
    );
    const nonce = utils.nonce()

    // append script at path to the document body
    function inject(path) {
      const toolkitUri = currentPanel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, ...[path]))
      $("body").append(`<script type="module" nonce="${nonce}" src="${toolkitUri}"></script>`)
    }

    inject("./node_modules/@vscode/webview-ui-toolkit/dist/toolkit.js")
    inject("./node_modules/iink-js/dist/iink.min.js")

    currentPanel.webview.html = $.root().html().replace(/ToBeReplacedByRandomToken/g, nonce)
    // Handle messages from the webview
    currentPanel.webview.onDidReceiveMessage(
      message => {

        switch (message.command) {
          case 'requestCurrentLine':
            pushCurrentLine()
            return;
          case 'requestCustom':
            pushCustom()
            return;
          case 'editCurrentLine':
            setEditorText(message.text, message.control);
          case 'copyToClipboard':
            vscode.env.clipboard.writeText(message.text);
            return;
          case 'recognize':
            context.secrets.get("token").then((token) => {
              currentPanel.webview.postMessage({
                command: 'recognize',
                token: token,
                provider: message.provider
              });
            })
            return;
        }
      },
      undefined,
      context.subscriptions
    );

    realTimeCurrentEditorUpdate()

    currentPanel.onDidDispose(
      () => {
        if (updateHandle != undefined) {
          clearInterval(updateHandle)
          updateHandle = undefined
        }
        currentPanel = undefined;
      },
      undefined,
      context.subscriptions
    );
  }

  function getEditorText(show) {
    let currentEditor_ = currentEditor
    let currentLine_ = currentLine
    let activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
      currentEditor_ = activeTextEditor;
    }
    if (!currentEditor_ || currentEditor_.document.isClosed) {
      if (show) vscode.window.showErrorMessage('No active line');
      return {};
    }
    currentLine_ = currentEditor_.selection.active.line

    let text = currentEditor_.document.getText(new vscode.Range(currentLine_, 0, currentLine_ + 1, 0))
    currentText = text
    return { text, currentEditor_, currentLine_ }
  }

  function pushCurrentLine() {
    let { text, currentEditor_, currentLine_ } = getEditorText(true)
    if (typeof text === 'string' && currentPanel) {
      currentEditor = currentEditor_
      currentLine = currentLine_
      currentPanel.webview.postMessage({ command: 'currentLine', content: text });
    }
  }

  let updateCheckStrings = ['', '']
  function resetCheckStrings(str) {
    updateCheckStrings[0] = updateCheckStrings[1] = str
  }
  function realTimeCurrentEditorUpdate() {
    updateHandle = setInterval(() => {
      let { text, currentEditor_, currentLine_ } = getEditorText(false)
      if (typeof text === 'string' && currentPanel) {
        let topush = false
        if (updateCheckStrings[0] !== updateCheckStrings[1] && text === updateCheckStrings[0]) {
          topush = true
        }
        updateCheckStrings[1] = updateCheckStrings[0]
        updateCheckStrings[0] = text
        currentEditor = currentEditor_
        currentLine = currentLine_
        if (settings.directory) {
          let link = langs.readLink(currentEditor.document.languageId, text)
          if (link) text = fs.readFileSync(path.join(vscode.workspace.rootPath, link), { encoding: 'utf-8' })
        }
        if (topush) {
          currentPanel.webview.postMessage({ command: 'currentLine', content: text });
        }
      }
    }, 100)
  }


  function setEditorText(text, control) {
    if (settings.directory && !text.startsWith("$$")) {
      let filename = `${uuidv4()}.svg`
      let alt = "";

      // reuse existing alt and filename, if available
      if (match = currentText.match(/!\[(.*)\]\((.*\.svg)\)/)) {
        alt = match[1]
        filename = match[2].replace(/^.*[\\\/]/, '')
      }

      utils.write(text, filename)
      let name = path.join(settings.directory, filename)
      text = langs.createLink(currentEditor.document.languageId, name, alt)
    }

    if (!currentEditor || currentEditor.document.isClosed) {
      vscode.window.showErrorMessage('The text editor has been closed');
      return;
    }

    let p = vscode.window.showTextDocument(currentEditor.document, {
      viewColumn: currentEditor.viewColumn,
      selection: new vscode.Range(currentLine, 0, currentLine, 0)
    }).then((editor) => editor.edit(edit => {
      edit.replace(new vscode.Range(currentLine, 0, currentLine + 1, 0), text + '\n');
      resetCheckStrings(text.split('\n')[0] + '\n')
    }))

    if (control !== 0) {
      p = p.then(() => {
        vscode.window.showTextDocument(currentEditor.document, {
          viewColumn: currentEditor.viewColumn,
          selection: new vscode.Range(currentLine + control, 0, currentLine + control, 0)
        })
      }).then(() => {
        pushCurrentLine()
      })
    }
  }

  function pushCustom() {
    let buttons = settings['buttons']
    context.secrets.get("provider").then((provider) => {
      if (provider) {
        buttons = [{
          icon: "square-root-alt",
          title: "recognize to latex",
          function: `window.drawAPI.unstable.recognize("${provider}")`
        }].concat(buttons)
      }

      currentPanel.webview.postMessage({
        command: 'customButtons',
        content: buttons
      });
    })
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('draw.editCurrentLineAsSVG', () => {
      if (currentPanel) {
        currentPanel.reveal();
        pushCurrentLine()
      } else {
        vscode.commands.executeCommand('workbench.action.editorLayoutTwoRowsRight').then(() => {
          createNewPanel()
          pushCurrentLine()
        })
      }
    }),
    vscode.commands.registerCommand('draw.configureHTR', () => {
      htr.init(context, currentPanel);
    })
  );

}
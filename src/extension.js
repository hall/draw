const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require('uuid');
const cheerio = require("cheerio");
var Walk = require("@root/walk");

// load root webview document
var $ = cheerio.load(fs.readFileSync(path.join(__dirname, 'webview.html'), { encoding: 'utf8' }))

let settings = vscode.workspace.getConfiguration('draw');

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}


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

var webviewContent;
Walk.walk(path.join(__dirname, "webview"), loadWebviewFiles).then(function () {
  webviewContent = $.root().html().replace(/ToBeReplacedByRandomToken/g, getNonce())
});

/** @param {vscode.ExtensionContext} context */
function activate(context) {

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

    currentPanel.webview.html = getWebviewContent();
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

  function showPanel() {
    currentPanel.reveal();
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
          let link = readLink(currentEditor.document.languageId, text)
          if (link) text = fs.readFileSync(path.join(vscode.workspace.rootPath, link), { encoding: 'utf-8' })
        }
        if (topush) {
          currentPanel.webview.postMessage({ command: 'currentLine', content: text });
        }
      }
    }, 100)
  }

  // write text to filename
  function writeFile(text, filename) {
    dir = path.join(vscode.workspace.rootPath, settings.directory);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(path.join(dir, filename), text, { encoding: 'utf8' });
  }

  // return language formatted link to filename; optionally, with alt text
  function createLink(language, filename, alt) {
    // https://hyperpolyglot.org/lightweight-markup
    switch (language) {

      case 'markdown':
        return `![${alt}](${filename})`

      case 'asciidoc':
        return `image::${filename}[${alt}]`

      case 'restructuredtext':
        return `.. image:: ${filename}` // TODO: add alt text `\n   :alt: ${alt}`

      // case 'mediawiki':
      //   return `[[File:${filename}|alt=${alt}]]`

      // case 'org':
      //   return `[[${filename}]]`

    }
  }

  Array.prototype.swap = function (a, b) {
    this[a] = this.splice(b, 1, this[a])[0]
    return this
  }

  // return alt text and filename (in that order) from link in language format
  function readLink(language, link) {
    // https://hyperpolyglot.org/lightweight-markup
    let match;
    switch (language) {

      case 'markdown':
        match = link.match(/!\[(.*)\]\((.*)\)/)
        break

      case 'asciidoc':
        match = link.match(/image::(.*)\[(.*)\]/)
        if (match) match.swap(1, 2)
        break

      case 'restructuredtext':
        // TODO: support multiline text for alt
        match = link.match(/..() image:: (.*)/)
        break

      // case 'mediawiki':
      //   match = link.match()
      //   break

      // case 'org':
      //   match = link.match()
      //   break
    }
    if (match) return match[1], match[2]
  }

  function setEditorText(text, control) {
    if (settings.directory) {
      let filename = `${uuidv4()}.svg`
      let alt = "";

      // reuse existing alt and filename, if available
      if (match = currentText.match(/!\[(.*)\]\((.*\.svg)\)/)) {
        alt = match[1]
        filename = match[2].replace(/^.*[\\\/]/, '')
      }

      writeFile(text, filename)
      let name = path.join(settings.directory, filename)
      text = createLink(currentEditor.document.languageId, name, alt)
    }

    if (!currentEditor || currentEditor.document.isClosed) {
      vscode.window.showErrorMessage('The text editor has been closed');
      return;
    }
    let p = vscode.window.showTextDocument(currentEditor.document, {
      viewColumn: currentEditor.viewColumn,
      selection: new vscode.Range(currentLine, 0, currentLine, 0)
    })
      .then((editor) => editor.edit(edit => {
        let lf = '\n'
        edit.replace(new vscode.Range(currentLine, 0, currentLine + 1, 0), text + lf);
        resetCheckStrings(text.split('\n')[0] + '\n')
      }))
    if (control !== 0) {
      p = p
        .then(() => vscode.window.showTextDocument(currentEditor.document, {
          viewColumn: currentEditor.viewColumn,
          selection: new vscode.Range(currentLine + control, 0, currentLine + control, 0)
        })) // the next line somehow not working, so use this line
        // .then(() => currentEditor.revealRange(
        //   new vscode.Range(currentLine + control, 0, currentLine + control, 0)
        // )) 
        .then(() => {
          pushCurrentLine()
        })
    }
  }

  function pushCustom() {
    let customizedButtons = settings['customized-buttons'];
    currentPanel.webview.postMessage({ command: 'custom', content: { operate: customizedButtons } });
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('draw.editCurrentLineAsSVG', () => {
      if (currentPanel) {
        showPanel()
        pushCurrentLine()
      } else {
        vscode.commands.executeCommand('workbench.action.editorLayoutTwoRowsRight')
          .then(() => {
            createNewPanel()
            pushCurrentLine()
          })
      }
    })
  );

}
exports.activate = activate;

function getWebviewContent() {
  return webviewContent
}
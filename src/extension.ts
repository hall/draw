import vscode = require("vscode");

import { Draw, getWebviewOptions } from './panels/draw';
import htr = require("./htr");

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('draw.editCurrentLineAsSVG', () => {
      Draw.createOrShow(context);
    }),
    vscode.commands.registerCommand('draw.configureHTR', () => {
      htr.init(context);
    })
  );

  vscode.window.registerWebviewPanelSerializer(Draw.viewType, {
    async deserializeWebviewPanel(webviewPanel, state) {
      webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
      Draw.revive(webviewPanel, context);
    }
  });
}

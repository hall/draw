import * as vscode from "vscode";

import { Draw, getWebviewOptions } from './draw';
import * as htr from "./htr";
import * as pkg from '../package.json';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${pkg.name}.editCurrentLineAsSVG`, () => {
      Draw.createOrShow(context);
    }),
    vscode.commands.registerCommand(`${pkg.name}.configureHTR`, () => {
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

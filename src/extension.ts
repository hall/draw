import * as vscode from "vscode";

import { Draw, getWebviewOptions } from './draw';
import * as htr from "./htr";
import * as pkg from '../package.json';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${pkg.name}.editCurrentLine`, () => {
      new Draw(context);
    }),
    vscode.commands.registerCommand(`${pkg.name}.configureHTR`, () => {
      htr.init(context);
    })
  );

  vscode.window.registerWebviewPanelSerializer(Draw.viewType, {
    async deserializeWebviewPanel(panel, state) {
      panel.webview.options = getWebviewOptions(context.extensionUri);
      new Draw(context, panel);
    }
  });

  vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
    if (event.affectsConfiguration(Draw.viewType)) {
      Draw.settings = vscode.workspace.getConfiguration(Draw.viewType);
    }
  });
}

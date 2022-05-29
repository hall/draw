import { By, EditorView, WebView, Workbench } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('Extension', () => {
    /** helper to wait X seconds */
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    let webview: WebView;

    before(async function () {
        await new Workbench().executeCommand('draw edit');
        await sleep(1000);

        webview = await new EditorView().openEditor('Draw', 1) as WebView;
        await webview.switchToFrame();
    });

    it('is disabled when no active editor exists', async function () {
        const save = await webview.findWebElement(By.id("svg-save"));
        expect(! await save.isEnabled());
    });

    after(async function () {
        await webview.switchBack();
        await new EditorView().closeAllEditors();
    });
});

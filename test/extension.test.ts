import { By, Editor, EditorView, TextEditor, TextSetting, VSBrowser, WebElement, WebView, Workbench } from 'vscode-extension-tester';
import { expect } from 'chai';

import * as pkg from '../package.json';

const files = {
    markdown: "test.md"
};

describe('Extension', () => {
    /** helper to wait X milliseconds */
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    let view: EditorView;
    let webview: WebView;
    let workbench: Workbench;

    before('open webview', async function () {
        this.timeout(120000); // ci needs some time
        await VSBrowser.instance.openResources("test/resources");
        view = await new EditorView();

        workbench = await new Workbench();
        await workbench.executeCommand('draw edit');
        await sleep(1000);

        webview = await view.openEditor(pkg.displayName, 1) as WebView;
    });

    it('is displayed', async function () {
        expect(await webview.isDisplayed());
    });

    describe("save", () => {
        let editor: TextEditor;
        let button: WebElement;
        let canvas: WebElement;

        before('collect elements', async function () {
            await webview.switchToFrame();
            button = await webview.findWebElement(By.id("svg-save"));
            canvas = await webview.findWebElement(By.id("svg"));
        });

        it('is disabled (when no editor exists)', async function () {
            expect(button.isEnabled()).not.to.be.true;
        });

        it('is enabled (when an editor exists)', async function () {
            await webview.switchBack();
            await workbench.executeCommand('focus left group');
            await VSBrowser.instance.openResources(files.markdown);
            await webview.switchToFrame();
            expect(await button.isEnabled()).to.be.true;
        });

        it('creates svg inline', async function () {
            await webview.getDriver().actions().dragAndDrop(canvas, { x: 100, y: 100 }).perform();
            await button.click();
            await webview.switchBack();

            editor = await new TextEditor();
            const text = await editor.getTextAtLine(1);
            expect(text).equals(`<svg id="svg" xmlns="http://www.w3.org/2000/svg" viewBox="383 551 120 120" height="120"><path d="M 393,561 L 493,661" fill="none" stroke="#6190e8" stroke-width="2"></path></svg>`);
            await editor.clearText();
        });

        it('writes svg to file', async function () {
            const settings = await workbench.openSettings();
            const directory = await settings.findSetting("Directory", "Draw") as TextSetting;
            await directory.setValue("assets");
            await view.closeEditor("Settings");
            await sleep(1000);

            await webview.switchToFrame();
            await webview.getDriver().actions().dragAndDrop(canvas, { x: 150, y: -200 }).perform();
            await button.click();
            await webview.switchBack();

            const text = await editor.getTextAtLine(1);
            expect(getFilename(text)).to.be.not.undefined;
        });

        function getFilename(link: string) {
            const match = link.match(/!\[\]\((.*)\)/);
            if (match) {
                return match[1];
            }
        }

        it('reuses existing filename', async function () {
            const fname = getFilename(await editor.getTextAtLine(1));
            expect(fname).to.not.be.undefined;

            await webview.switchToFrame();
            await webview.getDriver().actions().dragAndDrop(canvas, { x: 50, y: -20 }).perform();
            await button.click();
            await webview.switchBack();

            expect(fname).to.equal(getFilename(await editor.getTextAtLine(1)));
        });

        // after('clear editors', async function () {
        //     await editor.clearText();
        //     await view.closeAllEditors();
        // });

    });

    // after('close webview', async function () {
    //     await new EditorView().closeAllEditors();
    // });
});

import { By, Editor, EditorGroup, EditorView, VSBrowser, WebView, Workbench } from 'vscode-extension-tester';
import { expect } from 'chai';

const files = {
    markdown: "test.md"
};

describe('Extension', () => {
    /** helper to wait X milliseconds */
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    let webview: WebView;

    before('open webview', async function () {
        this.timeout(120000); // ci needs some time

        await VSBrowser.instance.openResources(files.markdown);

        await new Workbench().executeCommand('draw edit');
        await sleep(1000);

        webview = await new EditorView().openEditor('Draw', 1) as WebView;
    });

    it('is displayed', async function () {
        expect(await webview.isDisplayed());
    });

    describe("save", () => {
        let button: any;
        let editor: EditorView;

        before('collect elements', async function () {
            editor = await new EditorView();

            await webview.switchToFrame();
            button = await webview.findWebElement(By.id("svg-save"));
        });

        it('is enabled when an editor exists', async function () {
            expect(await button.isEnabled()).to.be.true;
        });

        // it('is disabled when no active editor exists', async function () {
        //     editor.closeEditor(files.markdown);

        //     expect(await button.isEnabled()).not.to.be.true;
        // });

    });


    // after('close webview', async function () {
    //     await webview.switchBack();
    //     await new EditorView().closeAllEditors();
    // });
});

import * as assert from 'assert';

import { VSBrowser, WebDriver, WebView, Workbench } from 'vscode-extension-tester';

describe('Extension', () => {
    let browser: VSBrowser;
    let driver: WebDriver;
    let workbench: Workbench;
    let timer: any;

    before(async () => {
        browser = VSBrowser.instance;
        driver = browser.driver;
        workbench = new Workbench();
        timer = (ms: number) => new Promise(res => setTimeout(res, ms));
    });

    it('opens', async function () {
        this.timeout(20000);
        await workbench.executeCommand('draw edit');
        const webview = new WebView();
        assert(await webview.isDisplayed());
    });
});
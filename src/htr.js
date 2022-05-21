const vscode = require("vscode");

// prompt user for provider and credentials
exports.init = function (context) {
    context.secrets.get("provider").then((provider) => {
        return vscode.window.showQuickPick(['myscript', { label: 'none', description: "delete existing provider" }], {
            placeHolder: 'provider',
        })
    }).then((provider) => {
        if (provider === "none") {
            context.secrets.delete("provider").then(() => {
                context.secrets.delete("token").then(() => {
                })
            })
            return
        }
        context.secrets.store("provider", provider).then(() => {
            switch (provider) {
                case 'myscript':
                    context.secrets.get("token").then((token) => {
                        if (!token) token = {}
                        vscode.window.showInputBox({
                            placeHolder: 'application token',
                            value: token?.app,
                            validateInput: text => isUUID(text)
                        }).then((app) => {
                            token["app"] = app
                            // save here in case of partial completion
                            return context.secrets.store("token", token);
                        }).then(() => {
                            return vscode.window.showInputBox({
                                placeHolder: 'hmac key',
                                value: token?.hmac,
                                validateInput: text => isUUID(text),
                            })
                        }).then((hmac) => {
                            token["hmac"] = hmac
                            return context.secrets.store("token", token);
                        })
                    })

                    break;
            }

        })

    })
}

function isUUID(string) {
    return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(string)
}

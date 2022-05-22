import vscode = require("vscode");

// prompt user for provider and credentials
export function init(context: vscode.ExtensionContext) {
    return vscode.window.showQuickPick([
        {
            label: 'myscript'
        },
        {
            label: 'mathpix'
        },
        {
            label: 'none',
            description: "delete existing provider"
        }
    ],
        {
            placeHolder: 'provider'
        }
    ).then((provider: vscode.QuickPickItem | undefined) => {
        if (provider && provider.label === "none") {
            context.secrets.delete("provider").then(() => {
                context.secrets.delete("token").then(() => {
                })
            })
            return
        }
        if (provider)
            context.secrets.store("provider", provider.label).then(() => {
                if (provider)
                    switch (provider.label) {
                        case 'myscript':
                            prompt(context, [
                                {
                                    key: "app",
                                    placeHolder: "application token",
                                    validate: isUUID
                                },
                                {
                                    key: "hmac",
                                    placeHolder: "hmac key",
                                    validate: isUUID
                                }
                            ])
                            break;

                        case 'mathpix':
                            prompt(context, [
                                {
                                    key: "id",
                                    placeHolder: "app id",
                                    validate: () => true
                                },
                                {
                                    key: "key",
                                    placeHolder: "app key",
                                    validate: () => true
                                }
                            ])
                            break
                    }

            })

    })
}

function isUUID(string: string) {
    return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(string)
}

// prompt user in context for list of items
// save responses under the "token" secret store key
/*
  item = {
      key: "name",
      placeHolder: "placeholder text",
      validate: () => console.log("validation function")
  }
*/
function prompt(context: vscode.ExtensionContext, items: any) {
    context.secrets.get("token").then((token: any) => {
        if (!token) token = {}

        for (let i = 0, p = Promise.resolve(); i < items.length; i++) {
            p = p.then(() => {
                return vscode.window.showInputBox({
                    placeHolder: items[i].placeHolder,
                    value: token[items[i].key] || null,
                    validateInput: text => items[i].validate(text)
                }).then((value) => {
                    // save here in case of partial completion
                    token[items[i].key] = value;
                    return context.secrets.store("token", token);
                })
            })
        }
    })
}
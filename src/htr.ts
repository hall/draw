import * as vscode from "vscode";

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
                context.secrets.delete("token").then();
            });
            return;
        }
        if (provider)
            context.secrets.store("provider", provider.label).then(() => {
                if (provider)
                    switch (provider.label) {
                        case 'myscript':
                            prompt(context, [
                                {
                                    title: "app",
                                    placeHolder: "application token",
                                    validateInput: isUUID
                                },
                                {
                                    title: "hmac",
                                    placeHolder: "hmac key",
                                    validateInput: isUUID
                                }
                            ]);
                            break;

                        case 'mathpix':
                            prompt(context, [
                                {
                                    title: "id",
                                    placeHolder: "app id",
                                    validateInput: () => null
                                },
                                {
                                    title: "key",
                                    placeHolder: "app key",
                                    validateInput: () => null
                                }
                            ]);
                            break;
                    }

            });

    });
}

function isUUID(string: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(string)) {
        return "value must be a valid UUID";
    }
    return "";
}

// prompt user in context for list of items
// save responses under the "token" secret store key
function prompt(context: vscode.ExtensionContext, items: vscode.InputBoxOptions[]) {
    context.secrets.get("token").then((token: any) => {
        if (!token) token = {};

        for (let i = 0, p = Promise.resolve(); i < items.length; i++) {
            p = p.then(() => {
                const v = items[i].title;
                return vscode.window.showInputBox({
                    placeHolder: items[i].placeHolder,
                    value: v ? token[v] : null,
                    password: true,
                    validateInput: items[i].validateInput
                }).then((value) => {
                    // save here in case of partial completion
                    if (v) token[v] = value;
                    return context.secrets.store("token", token);
                });
            });
        }
    });
}
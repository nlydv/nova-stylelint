/*
 * Copyright © 2022 Neel Yadav
 * MIT License
 *
 *     A Stylelint extension for Nova, a new macOS-native
 *     code editor from Panic.
 *
 * Authors:    Neel Yadav <mail@neelyadav.com>
 * Created:    March 23rd, 2022
 * Website:    https://github.com/nlydv/nova-stylelint
 *
 */

const IssuesProvider = require("./provider");
const batteries = require("./batteries");

const composite = new CompositeDisposable();

function activate() {
    if ( ! batteries.areInstalled() ) {
        batteries.install()
            .then(out => console.log(out))
            .catch(err => console.error(err));
    }

    const provider = nova.assistants.registerIssueAssistant(
        [ "css", "scss", "sass", "less" ],
        new IssuesProvider(),
        { event: "onChange" }
    );

    composite.add(provider);
    console.log("Stylelint extension for Nova has activated.");
}

function deactivate() {
    composite.dispose();
    console.log("Stylelint extension for Nova has deactivated.");
}

module.exports = {
    activate,
    deactivate,
    IssuesProvider
};

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

async function activate() {
    if ( ! batteries.areInstalled() ) {
        await batteries.install()
            .then(out => console.log(out))
            .catch(err => console.error(err));
    }

    const issuesProvider = new IssuesProvider;

    const provider = nova.assistants.registerIssueAssistant(
        [ "css", "scss", "sass", "less" ],
        issuesProvider,
        { event: "onChange" }
    );

    nova.commands.register("lint", editor => {
        if ( ! TextEditor.isTextEditor(editor) )
            editor = nova.workspace.activeTextEditor;

        const lintCmd = issuesProvider.provideIssues(editor);
        composite.add(lintCmd);
    });

    nova.commands.register("lintFix", editor => {
        if ( ! TextEditor.isTextEditor(editor) )
            editor = nova.workspace.activeTextEditor;

        const fixCmd = issuesProvider.fixIssues(editor);
        composite.add(fixCmd);
    });

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

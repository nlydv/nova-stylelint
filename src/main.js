/*
 * Copyright © 2022 Neel Yadav
 * MIT License
 *
 *     Nova Stylelint (v1.1.0)
 *
 *     Stylelint extension for Nova, a new macOS-native code
 *     editor from Panic. Presents real-time stylesheet linting
 *     with inline and sidebar warnings by plugging into the
 *     built-in issue provider system.
 *
 * Authors:    Neel Yadav <mail@neelyadav.com>
 * Created:    March 23rd, 2022
 * Website:    https://github.com/nlydv/nova-stylelint
 *
 */

const IssuesProvider = require("./provider");

const composite = new CompositeDisposable();

async function activate() {
    const issuesProvider = new IssuesProvider;

    const provider = nova.assistants.registerIssueAssistant(
        issuesProvider.syntaxes,
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

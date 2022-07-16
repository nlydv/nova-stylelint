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

const batteries = require("./batteries");
const IssuesProvider = require("./provider");


const composite = new CompositeDisposable();

async function activate() {
    const issuesProvider = new IssuesProvider;

    // This is to avoid premature execution and naively throwing around promises
    // that resulted in jittery and often unpredictable behavior previously.
    issuesProvider.hasLiveBatteries = await batteries.kickstart();

    const provider = nova.assistants.registerIssueAssistant(
        issuesProvider.syntaxes,
        issuesProvider,
        { event: "onChange" }
    );

    const lint = nova.commands.register("lint", editor => {
        if ( ! TextEditor.isTextEditor(editor) )
            editor = nova.workspace.activeTextEditor;

        issuesProvider.provideIssues(editor);
    });

    const lintFix = nova.commands.register("lintFix", editor => {
        if ( ! TextEditor.isTextEditor(editor) )
            editor = nova.workspace.activeTextEditor;

        issuesProvider.fixIssues(editor);
    });

    composite.add(provider);
    composite.add(lint);
    composite.add(lintFix);
    composite.add(issuesProvider.switchListener);

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

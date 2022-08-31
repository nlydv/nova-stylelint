/*
 * Copyright © 2022 Neel Yadav
 * MIT License
 *
 *     Nova Stylelint (v2.0.2)
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
const provider = new IssuesProvider();

async function activate() {
    // This is to avoid premature execution and naively throwing around promises
    // that resulted in jittery and often unpredictable behavior previously.
    provider.hasLiveBatteries = await batteries.kickstart();

    const assistant = nova.assistants.registerIssueAssistant(
        [...provider.langsAvail],
        provider,
        { event: "onChange" }
    );

    const lint = nova.commands.register("lint", editor => {
        if ( ! TextEditor.isTextEditor(editor) )
            editor = nova.workspace.activeTextEditor;

        provider.provideIssues(editor);
    });

    const lintFix = nova.commands.register("lintFix", editor => {
        if ( ! TextEditor.isTextEditor(editor) )
            editor = nova.workspace.activeTextEditor;

        provider.fixIssues(editor);
    });

    const resetIssues = nova.commands.register("resetIssues", provider.resetIssues);

    composite.add(lint);
    composite.add(lintFix);
    composite.add(resetIssues);
    composite.add(assistant);

    console.log("Stylelint extension for Nova has activated.");
}

function deactivate() {
    // Curious as to what exactly "disposal" means for Nova... e.g. here we're disposing
    // issue assistant's disposable properties before disposing issue assistant itself,
    // which is logical enough, but would it be problematic to do it the other way around?
    provider.listeners.dispose();
    composite.dispose();

    console.log("Stylelint extension for Nova has deactivated.");
}

module.exports = {
    activate,
    deactivate
};

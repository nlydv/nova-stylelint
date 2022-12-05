/*
 * Copyright © 2022 Neel Yadav
 * MIT License
 *
 *     Nova Stylelint (v2.0.3)
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
const { getPrefs, getFullKey } = require("./util");

const composite = new CompositeDisposable();
const listeners = new CompositeDisposable();
const provider = new IssuesProvider();

const fixOnSaveKey = getFullKey("fixOnSave");
const inheritGlobalConfigKey = getFullKey("local.inherit");

async function activater() {
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

    const handleAddTextEditor = editor => {
        if (!provider.langsAvail.has(editor.document.syntax)) return;
        const fixOnSave = getPrefs().fixOnSave;
        if (!fixOnSave) return;
        listeners.add(
            editor.onWillSave(editor => {
                nova.commands.invoke("lintFix", editor);
            })
        );
    };

    const handleConfigChange = () => {
        listeners.dispose(); // always dispose to prevent overlapping listeners
        const fixOnSave = getPrefs().fixOnSave;

        if (!fixOnSave) return;

        for (const editor of nova.workspace.textEditors) {
            if (!provider.langsAvail.has(editor.document.syntax)) continue;
            listeners.add(
                editor.onWillSave(editor => {
                    nova.commands.invoke("lintFix", editor);
                })
            );
        }
    };

    composite.add(lint);
    composite.add(lintFix);
    composite.add(resetIssues);
    composite.add(assistant);
    composite.add(nova.config.onDidChange(fixOnSaveKey, handleConfigChange));
    composite.add(nova.workspace.config.onDidChange(fixOnSaveKey, handleConfigChange));
    composite.add(nova.workspace.config.onDidChange(inheritGlobalConfigKey, handleConfigChange));
    composite.add(nova.workspace.onDidAddTextEditor(handleAddTextEditor));
}

function activate() {
    return activater()
        .catch(err => {
            console.error("Stylelint extension failed to activate");
            console.error(err);
            nova.workspace.showErrorMessage(err);
        })
        .then(() => {
            console.log("Stylelint extension for Nova has activated.");
        });
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

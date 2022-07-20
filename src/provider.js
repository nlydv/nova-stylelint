const batteries = require("./batteries");
const execLinter = require("./linter");
const { alert, getPrefs } = require("./util");


class IssuesProvider {
    constructor() {
        this.langsAvail = new Set(["css", "scss", "sass", "less", "html", "php"]);
        this.langsEnabled = getPrefs().getLangs(this.langsAvail);

        this.hasLiveBatteries = false;
        this.listeners = new CompositeDisposable();

        const disableKey = "com.neelyadav.Stylelint.local.disable";
        this.isDisabled = nova.workspace.config.get(disableKey);
        this.listeners.add(
            nova.workspace.config.onDidChange(disableKey, newValue => {
                this.isDisabled = newValue;
                this.resetIssues();
            })
        );

        for ( const lang of this.langsAvail ) {
            const key = `com.neelyadav.Stylelint.lang.${lang}`;
            const flipper = bool => {
                bool ? this.langsEnabled.add(lang) : this.langsEnabled.delete(lang);
                this.resetIssues(lang);
            };

            this.listeners.add(nova.config.onDidChange(key, flipper));
            this.listeners.add(nova.workspace.config.onDidChange(key,flipper));
        }
    }

    exec(editor, fix = false) {
        if ( ! this.langsEnabled.has(editor.document.syntax) )
            return null;

        return execLinter(editor, fix).catch(err => {
            console.error(err);
            alert(`Uncaught Error\n\n${err.name}:\n${err.message}`, "Report");
        });
    }

    fixIssues(editor) {
        function applyFix(res) {
            editor.edit(editorEdit => {
                editorEdit.replace(new Range(0, editor.document.length), res);
            });
        }

        this.exec(editor, true)
            .then(applyFix)
            .catch(err => null);
    }

    async provideIssues(editor) {
        if ( ! this.hasLiveBatteries || this.isDisabled )
            return [];

        const issues = [];
        const results = await this.exec(editor);

        for ( const r of results ) {
            for ( const w of r.warnings ) {
                const issue = new Issue();
                issue.source = "Stylelint";
                issue.code = w.rule;
                issue.message = w.text.replace(/ \(.*\)$/, "");
                issue.severity = ( w.severity === "error" ? IssueSeverity.Error : IssueSeverity.Warning );
                issue.line = w.line;
                issue.column = w.column;
                issue.endLine = w.endLine;
                issue.endColumn = w.endColumn;

                issues.push(issue);
            }
        }

        return issues;
    }

    // @TODO: Move this obnoxiously large comment block to some proper documentation
    // file outside of source code

    // A hacky method to programmatically re-lint open files by tricking Nova into
    // thinking the user has edited the document and thus triggering the "onChange"
    // issue validation cycle. The purpose of this is for giving users an immediate
    // responsive indication of certain extension preference changes, rather than
    // requiring them to edit every open document before any visible changes take
    // effect. For example, when disabling extension in workspace, all previous
    // linting results across all open files should immediately disappear, and vice
    // versa. The only problem with how this method implements that, is that leaves
    // a residual edit history item—a null edit, nevertheless—on each call such
    // that, afterwards, undoing an edit (i.e. pressing `⌘Z` once) appears to do
    // nothing as does a subsequent redo edit (`⇧⌘Z`). Nova should really have some
    // way to do this via their API; standalone `IssueCollection` objects do have
    // such a method, but there's nothing similar if using a full-on Issue Assistant
    // registered with the global `AssistantsRegistry` object.
    resetIssues(...syntaxes) {
        syntaxes = syntaxes.length > 0 ? new Set(syntaxes) : this.langsAvail;

        const editors = nova.workspace.textEditors
            .filter(editor => syntaxes.has(editor.document.syntax));

        for ( const editor of editors ) {
            const wasClean = ! editor.document.isDirty;
            editor.edit(editorEdit => editorEdit.replace(new Range(0, 0), ""))
                .then(x => editor.document.isDirty && wasClean && editor.save());
        }
    }
}

module.exports = IssuesProvider;

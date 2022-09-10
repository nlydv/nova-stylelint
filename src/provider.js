const batteries = require("./batteries");
const execLinter = require("./linter");
const { alert, getPrefs } = require("./util");


// @TODO convert properties in constructor to class fields; switch to ESM; config latest Rollup
class IssuesProvider {
    constructor() {
        this.id = "com.neelyadav.Stylelint";
        /** @type {Set<string>} */
        this.langsAvail = new Set(["css", "scss", "sass", "less", "html", "php", "cssplus", "scssplus", "advphp"]);
        /** @type {Set<string>} */
        this.langsEnabled = getPrefs().getLangs(this.langsAvail);

        this.hasLiveBatteries = false;
        this.listeners = new CompositeDisposable();

        const disableKey = `${this.id}.local.disable`;
        this.isDisabled = nova.workspace.config.get(disableKey);
        this.listeners.add(
            nova.workspace.config.onDidChange(disableKey, newValue => {
                this.isDisabled = newValue;
                this.resetIssues();
            })
        );

        for ( const lang of this.langsAvail ) {
            const langKey = `${this.id}.lang.${lang}`;
            const flipper = bool => {
                bool ? this.langsEnabled.add(lang) : this.langsEnabled.delete(lang);
                this.resetIssues(lang);
            };

            this.listeners.add(nova.config.onDidChange(langKey, flipper));
            this.listeners.add(nova.workspace.config.onDidChange(langKey, flipper));
        }
    }

    exec(editor, fix = false) {
        if ( ! this.langsEnabled.has(editor.document.syntax) )
            return null;

        return execLinter(editor, fix).catch(err => {
            const seeConsole = "\n\nSee extension console for more info.";
            if ( err instanceof Error ) {
                const headline = `${err.name} [uncaught]:\n${err.message}`;
                const verbose = headline + (err?.stack.split("\n").join("\n    ") ?? "");
                console.error(verbose);
                alert(headline + seeConsole, "Report");
            } else {
                console.error(err + seeConsole);
                alert(`Uncaught Error\n\n${err.split("\n")[0].split("Error: ")[1]}`, "Report");
            }
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

        // For when execLinter catches, transforms, & returns error as single Issue object directly
        if ( results instanceof Issue ) {
            issues.push(results);
            return issues;
        }

        // @TODO create utility function(s) that create/configure Issue objects & props, make this more DRY

        for ( const r of results ) {
            // Stylelint sometimes catches parsing errors internally and returns them in the
            // `.parseErrors` array, but sometimes it'll return duplicates, so first dedupe them:
            r.parseErrors = [...new Set(r.parseErrors.map(i => JSON.stringify(i)))].map(i => JSON.parse(i));

            for ( const p of r.parseErrors ) {
                const issue = new Issue();
                issue.source = "Stylelint";
                issue.code = "Parse Error";
                issue.message = /\((?:.*Error: )?(.*)\)$/.exec(p.text)[1];
                issue.severity = IssueSeverity.Hint;
                issue.line = p.line;
                issue.column = p.column;
                issue.endLine = p.endLine;
                issue.endColumn = p.endColumn;
                issues.push(issue);
            }

            for ( const d of r.deprecations ) {
                const issue = new Issue();
                issue.source = "Stylelint";
                issue.code = "Deprecated Rule";
                issue.message = `${d.text} See: ${d.reference}`;
                issue.severity = IssueSeverity.Hint;
                issue.line = 1;
                issue.column = 1;
                issue.endLine = 2;
                issue.endColumn = 0;
                issues.push(issue);
            }

            for ( const i of r.invalidOptionWarnings ) {
                const issue = new Issue();
                issue.source = "Stylelint";
                issue.code = "Config Error";
                issue.message = `${i.text}`;
                issue.severity = IssueSeverity.Hint;
                issue.line = 1;
                issue.column = 1;
                issue.endLine = 2;
                issue.endColumn = 0;
                issues.push(issue);
            }

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

                // Separate out "meta issues" from normal linting results
                if ( w.text.startsWith(`Unknown rule ${w.rule}`) ) {
                    issue.code = "Config Error";
                    issue.message = `Unknown rule: ${w.rule}`;
                    issue.severity = IssueSeverity.Hint;
                    issue.line = 1;
                    issue.column = 1;
                    issue.endLine = 2;
                    issue.endColumn = 0;
                }

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

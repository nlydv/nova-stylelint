// import * as batteries from "./batteries";
import { execLinter } from "./linter";
import { alert, getPrefs } from "./util";


// @TODO convert properties in constructor to class fields; switch to ESM; config latest Rollup
export default class StylelintProvider {
    readonly id = "com.neelyadav.Stylelint";
    readonly langsAvail = new Set(["css", "scss", "sass", "less", "html", "php", "cssplus", "scssplus", "advphp"]);

    langsEnabled: Set<string> = getPrefs().getLangs(this.langsAvail);
    hasLiveBatteries = false;
    isDisabled       = false;

    listeners = new CompositeDisposable();

    constructor() {
        // this.langsAvail = new Set(["css", "scss", "sass", "less", "html", "php", "cssplus", "scssplus", "advphp"]);
        // this.langsEnabled = getPrefs().getLangs(this.langsAvail);

        const disableKey = `${this.id}.local.disable`;
        this.isDisabled = nova.workspace.config.get(disableKey, "boolean") ?? false;
        this.listeners.add(
            nova.workspace.config.onDidChange<boolean>(disableKey, newValue => {
                this.isDisabled = newValue;
                this.resetIssues();
            })
        );

        for ( const lang of this.langsAvail ) {
            const langKey = `${this.id}.lang.${lang}`;
            const flipper = (val: boolean) => {
                val ? this.langsEnabled.add(lang) : this.langsEnabled.delete(lang);
                this.resetIssues(lang);
            };

            this.listeners.add(nova.config.onDidChange(langKey, flipper));
            this.listeners.add(nova.workspace.config.onDidChange(langKey, flipper));
        }
    }

    async exec(editor: TextEditor, fix = false) {
        const syntax = editor.document.syntax;
        if ( syntax && ! this.langsEnabled.has(syntax) )
            return null;

        return await execLinter(editor, fix).catch(err => {
            const message = err instanceof Error
                ? `Uncaught ${err.name}:\n${err.message}\n\nSee extension console for more info.`
                : typeof err === "string"
                    ? `Uncaught Error:\n${err.trim().replace(/^Error: /, "")}`
                    : `Uncaught Error\n\n${err}`;

            console.error(err);
            alert("uncaught", message, "Report");
        });
    }

    async fixIssues(editor: TextEditor) {
        function applyFix(res: string) {
            editor.edit(editorEdit => {
                editorEdit.replace(new Range(0, editor.document.length), res);
            });
        }

        return this.exec(editor, true)
            .then(applyFix);
            // .catch(err => null);
    }

    async provideIssues(editor: TextEditor) {
        if ( ! this.hasLiveBatteries || this.isDisabled || editor.document.isEmpty )
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
            r.parseErrors = [...new Set<string>(
                r.parseErrors.map((i: any) => JSON.stringify(i)))
            ].map(i => JSON.parse(i));

            for ( const p of r.parseErrors ) {
                const issue = new Issue();
                issue.source = "Stylelint";
                issue.code = "Parse Error";
                issue.message = /\((?:.*Error: )?(.*)\)$/.exec(p.text)?.[1] ?? "";
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
                if ( w.code === "no-empty-source" )
                    return [];

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
    resetIssues(...syntaxes: string[]) {
        const langSet = syntaxes.length > 0 ? new Set(syntaxes) : this.langsAvail;

        const editors = nova.workspace.textEditors
            .filter(editor => editor.document.syntax && langSet.has(editor.document.syntax));

        for ( const editor of editors ) {
            const wasClean = ! editor.document.isDirty;
            editor.edit(editorEdit => editorEdit.replace(new Range(0, 0), ""))
                .then(_ => {
                    editor.document.isDirty && wasClean && editor.save();
                });
        }
    }
}

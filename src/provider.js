const batteries = require("./batteries");
const execLinter = require("./linter");
const { alert, notify } = require("./util");

class IssuesProvider {
    constructor() {
        this.syntaxes = [ "css", "scss", "sass", "less" ];

        this.installAttempts = 0;

        this.exec = (editor, fix = false) => {
            if ( ! this.syntaxes.includes(editor.document.syntax) )
                return null;

            return execLinter(editor, fix).catch(err => {
                console.error(err);
                alert(`${err.name}:\n${err.message}`, "Report");
            });
        };
    }

    get batteriesInstalled() {
        return batteries.areInstalled();
    }

    async provideIssues(editor) {
        const issues = [];

        // This block is to avoid premature execution and naively throwing around promises that
        // resulted in jittery and often unpredictable behavior previously.
        if ( ! this.batteriesInstalled ) {
            console.log("Postponing linter execution until initial install is complete...");

            if ( this.installAttempts >= 5 )
                alert("Error:\nInstallation of extension aborted after 5 failed attempts", "Report");
            else if ( this.installAttempts === 1 )
                alert("Warning:\nExtension installtion failed on first attempt.");
            else {
                await batteries.install()
                    .then(x => x && console.log("...installed successfully."))
                    .catch(x => this.installAttempts++);
                return [];
            }
        }

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

                issues.push(issue);
            }
        }

        return issues;
    }

    async fixIssues(editor) {
        const { document: doc } = editor;

        const res = await this.exec(editor, true).catch(err => null);

        if ( res ) {
            editor.edit(editorEdit => {
                editorEdit.replace(new Range(0, editor.document.length), res);
            });
        }
    }
}

module.exports = IssuesProvider;

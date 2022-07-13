const batteries = require("./batteries");
const execLinter = require("./linter");
const { alert } = require("./util");


class IssuesProvider {
    constructor() {
        this.syntaxes = [ "css", "scss", "sass", "less" ];

        const switchKey = "com.neelyadav.Stylelint.local.disable";
        const switchListener = nova.workspace.config.onDidChange(
            switchKey,
            (newValue, oldValue) => this.isDisabled = newValue
        );

        this.isDisabled = nova.workspace.config.get(switchKey);

        this.installAttempts = 0;
    }

    get batteriesInstalled() {
        return batteries.areInstalled();
    }

    exec(editor, fix = false) {
        if ( ! this.syntaxes.includes(editor.document.syntax) )
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
        if ( this.isDisabled ) return [];

        const issues = [];

        // This block is to avoid premature execution and naively throwing around promises that
        // resulted in jittery and often unpredictable behavior previously.
        if ( ! this.batteriesInstalled ) {
            console.log("Postponing linter execution until initial install is complete...");

            if ( this.installAttempts >= 3 )
                alert("Error:\nInstallation of extension aborted after 3 failed attempts", "Report");
            else if ( this.installAttempts === 1 )
                alert("Warning:\nExtension installation failed on first attempt.");
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
                issue.endLine = w.endLine;
                issue.endColumn = w.endColumn;

                issues.push(issue);
            }
        }

        return issues;
    }
}

module.exports = IssuesProvider;

const batteries = require("./batteries");
const execLinter = require("./linter");
const { alert } = require("./util");


class IssuesProvider {
    constructor() {
        this.syntaxes = [ "css", "scss", "sass", "less" ];

        const switchKey = "com.neelyadav.Stylelint.local.disable";
        this.isDisabled = nova.workspace.config.get(switchKey);
        this.switchListener = nova.workspace.config.onDidChange(
            switchKey,
            newValue => this.isDisabled = newValue
        );

        this.installAttempts = 0;
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
        const batteryStatus = await this.hasLiveBatteries();
        if ( ! batteryStatus || this.isDisabled )
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

    // This method exists to avoid premature execution and naively throwing around
    // promises that resulted in jittery and often unpredictable behavior previously.
    async hasLiveBatteries() {
        if ( ! batteries.areInstalled() ) {
            console.log("Postponing linter execution until initial install is complete...");

            for ( let x = 0; this.installAttempts < 3; this.installAttempts++ ) {
                if ( this.installAttempts === 1 )
                    alert("Warning:\nExtension installation failed on first attempt.\nRetrying...");
                if ( await batteries.install() ) {
                    console.log("...installed successfully.");
                    return true;
                }
            }

            if ( ! batteries.areInstalled() ) {
                alert("Error:\nInitial extension dependency installation failed.", "Report");
                return false;
            }
        } else {
            return true;
        }
    }
}

module.exports = IssuesProvider;

const execLinter = require("./linter");
const { notify } = require("./util");

class IssuesProvider {
    constructor() {

    }

    async provideIssues(editor) {
        const issues = [];
        const relPath = nova.workspace.relativizePath(editor.document.path);

        const res = await execLinter(editor).catch(err => {
            console.error(err);
            notify("stylelintError", err.message, "uncaught");
        });

        for ( const i of res ) {
            for ( const w of i.warnings ) {
                const issue = new Issue();
                issue.source = "Stylelint";
                issue.code = w.rule;
                issue.message = w.text.replace(/ \(.*\)/, "");
                issue.severity = ( w.severity === "error" ? IssueSeverity.Error : IssueSeverity.Warning );
                issue.line = w.line;
                issue.column = w.column;

                issues.push(issue);
            }
        }

        return issues;
    }
}

module.exports = IssuesProvider;

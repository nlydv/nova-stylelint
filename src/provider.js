const execLinter = require("./linter");
const { alert, notify } = require("./util");

class IssuesProvider {
    constructor() {
        this.exec = (editor, fix = false) => {
            return execLinter(editor, fix).catch(err => {
                console.error(err);
                alert(`Uncaught Error:\n\n${err.message}`);
            });
        };
    }

    async provideIssues(editor) {
        const issues = [];
        const relPath = nova.workspace.relativizePath(editor.document.path);

        const res = await this.exec(editor);

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

const batteries = require("./batteries");
const { rcWizard } = require("./wizard");
const { alert, getPrefs, newPath } = require("./util");


async function execLinter(editor, fix = false) {
    const { document: doc } = editor;
    const prefs = getPrefs();

    /* —————————————————————————————————————————————————————————————————— */

    const opt = {
        args: [ "-f", "json", "--stdin", "--stdin-filename", doc.path ],
        cwd: nova.path.dirname(doc.path),
        env: nova.environment,
        stdio: "pipe",
        shell: "/bin/bash"
    };

    // Prefered executable location via $PATH (unless `exec.custom` is on)
    opt.env.PATH = await newPath(opt.cwd);

    // Determine whether to auto-discover config, use specific config, or abort
    const wiz = await rcWizard(doc.path);
    if ( ! wiz )                    return;
    else if ( wiz === "standard" )  opt.args.push("--config", batteries.standard);
    else if ( wiz === "custom" )    opt.args.push("--config", prefs.fallback.custom);

    // Use pre-packaged "batteries" as basedir if needed otherwise use user-configured dir
    if ( prefs.basedir )            opt.args.push("--config-basedir", prefs.basedir);
    else if ( wiz === "batteries" ) opt.args.push("--config-basedir", batteries.dir);

    // When running "lintFix" command
    if ( fix ) opt.args.push("--fix");

    /* —————————————————————————————————————————————————————————————————— */

    const linter = new Promise((resolve, reject) => {
        let error = "";
        let output = "";

        const process = new Process(prefs.stylelint, opt);

        process.onStderr(line => error += line);
        process.onStdout(line => output += line);

        process.onDidExit(status => {
            if ( status === 0 || status === 2 )
                resolve(output);
            else
                reject(error);
        });

        process.start();

        const writer = process.stdin.getWriter();
        writer.ready.then(() => {
            const text = editor.getTextInRange(new Range(0, doc.length));
            writer.write(text);
            writer.close();
            process.start();
        });

        // For debugging purposes
        if ( nova.inDevMode() )
            console.log(`Path: ${opt.env.PATH}\nFrom: ${process.cwd}\nCmd:  ${process.args.slice(1).map(i => i.replace(/"/g, "")).join(" ")}`);
    });

    const result = await linter.catch(e => handleError(e, doc.path));

    return ( fix ? result : JSON.parse(result) );
}

function handleError(err, file = null) {
    const stderr = err.split("\n");
    if ( stderr[0].includes("Cannot resolve custom syntax module") ) {
        const msg = stderr[0].split("Error: ")[1];
        const note = "Note: Unlike regular plugins, Stylelint requires PostCSS custom syntax modules to be installed in the same location as Stylelint itself.";

        // @TODO: refactor out messages
        let formatted = `Custom Syntax Resolution Error\n\n${msg}\n\n${note}`;

        console.error(formatted);
        alert(formatted);
        return null;
    } else {
        throw err;
    }
}

/* —————————————————————————————————————————————————————————————————— */
/* —————————————————————————————————————————————————————————————————— */

module.exports = execLinter;

const batteries = require("./batteries");
const { getPrefs, newPath } = require("./util");
const { rcWizard } = require("./wizard");

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
    opt.env.PATH = newPath();

    // Determine whether to auto-discover config, use specific config, or arbort
    const rc = await rcWizard(doc.path);
    if ( ! rc )                    return;
    else if ( rc === "standard")   opt.args.push("--config", batteries.standard);
    else if ( rc === "custom" )    opt.args.push("--config", prefs.fallback.custom);

    // Use pre-packaged "batteries" as basedir if needed otherwise use user-configured dir
    if ( prefs.basedir )           opt.args.push("--config-basedir", prefs.basedir);
    else if ( rc === "batteries" ) opt.args.push("--config-basedir", batteries.dir);

    // When running fix command
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
            console.log(`From: ${process.cwd}\nCmd:  ${process.args.slice(1).map(i => i.replace(/"/g, "")).join(" ")}`);
    });

    if ( fix ) return await linter;
    else       return JSON.parse(await linter);
}

/* —————————————————————————————————————————————————————————————————— */
/* —————————————————————————————————————————————————————————————————— */

module.exports = execLinter;

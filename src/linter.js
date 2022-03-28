const batteries = require("./batteries");
const { notify, getConfigs, rcWizard } = require("./util");

async function execLinter(editor) {
    const { document: doc } = editor;
    const prefs = getConfigs();

    /* —————————————————————————————————————————————————————————————————— */

    const opt = {
        args: [ "-f", "json", "--stdin", "--stdin-filename", doc.path ],
        cwd: nova.path.dirname(doc.path),
        env: nova.environment,
        stdio: "pipe",
        shell: true
    };

    // Prefered executable location via $PATH
    let newPath = [ opt.env.PATH, batteries.dir ].join(":");
    if ( prefs["exec.custom"] )
        newPath = `${nova.path.dirname(prefs["exec.path"])}:${newPath}`;

    opt.env.PATH = newPath;

    // Determine whether to auto-discover config, use specific config, or arbort
    const rc = await rcWizard(doc.path);

    if ( ! rc )                              return;
    else if ( rc !== "continue" )            opt.args.push("--config", rc);
    else if ( rc.endsWith("standard.yaml") ) opt.args.push("--config-basedir", batteries.dir);

    // Apply custom basedir argument if set in preferences
    if ( prefs.basedir && ! opt.args.includes("--config-basedir") )
        opt.args.push("--config-basedir", prefs.basedir);


    /* —————————————————————————————————————————————————————————————————— */

    const process = new Promise((resolve, reject) => {
        let error = "";
        let output = "";

        const process = new Process("stylelint", opt);

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
    });

    return JSON.parse(await process);
}

/* —————————————————————————————————————————————————————————————————— */
/* —————————————————————————————————————————————————————————————————— */

module.exports = execLinter;

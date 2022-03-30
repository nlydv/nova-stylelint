const batteries = require("./batteries");

function notify(id, msg, error = null) {
    const notification = new NotificationRequest(id);
    notification.title = "Stylelint";
    notification.body = error ? `ERROR (${error})\n\n${msg}` : msg;
    nova.notifications.add(notification);
}

function getPrefs() {
    const prefs = { exec: {}, fallback: {}, cache: {} };

    const val = key => {
        let pref = nova.config.get(`com.neelyadav.Stylelint.${key}`);
        if ( pref && String(pref).startsWith("~/") )
            pref = nova.path.expanduser(pref);
        return pref;
    };

    prefs.exec.custom       = val("exec.custom");
    prefs.exec.path         = val("exec.path");
    prefs.fallback.behavior = val("fallback.behavior");
    prefs.fallback.custom   = val("fallback.custom");
    prefs.basedir           = val("basedir");
    prefs.cache.on          = val("cache.on");
    prefs.cache.path        = val("cache.path");

    return prefs;
}

// workaround to get open workspace root, if any, since `nova.workspace.path` doesn't seem to work
function workspacePath() {
    try {
        const active = nova.workspace.activeTextEditor?.document.path;
        if ( active ) return active.split(nova.workspace.relativizePath(active))[0].slice(0, -1);
        else return null;
    } catch (e) {
        return null;
    }
}

function newPath() {
    const prefs = getPrefs();
    const workspace = workspacePath();
    const bin = "/node_modules/.bin";
    const env = nova.environment.PATH;

    let newPath = [];

    if ( workspace && nova.fs.access(`${workspace}${bin}/stylelint`, nova.fs.X_OK) )
        newPath.push(`${workspace}${bin}`);

    newPath.push(env, batteries.dir);

    if ( prefs.exec.custom )
        newPath = [ nova.path.dirname(prefs.exec.path) ].concat(newPath);

    return newPath.join(":");
}

async function runProc(command, dir = null) {
    command = command.split(" ");
    const [ cmd, args ] = [ command.shift(), command ];

    const opt = {
        args: args,
        cwd: dir ?? nova.extension.path,
        env: nova.environment,
        stdio: "pipe",
        shell: true
    };

    opt.env.PATH = newPath();

    const proc = new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";

        const proc = new Process(cmd, opt);
        proc.onStdout(line => stdout += line);
        proc.onStderr(line => stderr += line);
        proc.onDidExit(status => status === 0 ? resolve(stdout) : reject(stderr));

        proc.start();
    });

    return await proc;
}

async function resolveConfig(file) {
    const config = new Promise((resolve, reject) => {
        const opt = {
            args: [ "--print-config", file ],
            cwd: nova.path.dirname(file),
            env: nova.environment,
            stdio: "pipe",
            shell: true
        };

        opt.env.PATH = newPath();

        const process = new Process("stylelint", opt);

        let err = "";
        process.onStderr(line => err += line);
        process.onDidExit(async status => {
            // stylelint finds rc AND is able to lint properly
            if ( status === 0 ) resolve(true);

            // stylelint finds rc BUT cannot resolve configured plugin/extend packages
            else if ( err.includes("configBasedir") ) {
                let cmd = process.args[1].split('" "').join(" ").slice(1, -1); // retry exact same command again, but with...
                cmd += ` --config-basedir ${batteries.dir}`;                   // "batteries included" folder as basedir to see if we have what it needs

                await runProc(cmd, process.cwd)
                    .then(out => resolve("batteries")) // if we do have the batteries stylint wants, let downstream proc know to use them
                    .catch(err => {                    // otherwise abort and tell downstream to throw error at user
                        console.warn(err);
                        resolve(err.split("\n")[0]);
                    });
            }

            // stylelint does NOT find rc, trigger fallback switch
            else resolve(false);
        });

        process.start();
    });

    return await config;
}

async function rcWizard(file) {
    const prefs = getPrefs();
    const hasRc = await resolveConfig(file);

    if ( ! hasRc ) {
        switch (prefs.fallback.behavior) {
            case "none":
                notify("noStylelintrc", "No available stylelint config found.", "stylelintrc");
                return null;

            case "ignore":
                return null;

            case "standard":
                return "standard";

            case "custom":
                if ( nova.fs.access(prefs.fallback.custom, nova.fs.F_OK) ) {
                    return prefs.fallback.custom;
                } else {
                    notify("nonExistentRc", "The configured fallback stylelintrc config path does not exist.", "config");
                    return null;
                }

            default:
                throw new Error("Unforseen outcome in conditional logic.\n\nPlease open an issue at:\ngithub.com/nlydv/nova-stylelint");
        }
    }

    else if ( hasRc === "batteries" ) {
        return "batteries";
    }

    else if ( hasRc.toString().includes("configBasedir") ) {
        // resolveConfig() passed configBasedir error forward, now we pass to user
        const msg = hasRc.substring(7).split(".").map(i => i.trim()).join("\n");
        notify("basedir", msg, "stylelintrc");

        return null;
    }

    else {
        return "continue";
    }

    // return value semantics
    // null                  => tell execLinter() to abort
    // "continue"            => tell execLinter() to run as is
    // "batteries"           => give execLinter() the go-ahead but use built-in basedir
    // "standard"            => no rc found; have execLinter() use stylelint-config-standard
    // prefs.fallback.custom => no rc found; have execLinter() use rc at path in returned value
}

module.exports = {
    notify,
    getPrefs,
    rcWizard,
    runProc,
    newPath
};

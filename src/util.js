const batteries = require("./batteries");

function notify(id, msg, error = null) {
    const notification = new NotificationRequest(id);
    notification.title = "Stylelint";
    notification.body = error ? `ERROR (${error})\n\n${msg}` : msg;
    nova.notifications.add(notification);
}

function getConfigs() {
    const keys = [
        "exec.custom",
        "exec.path",
        "fallback.behavior",
        "fallback.custom",
        "basedir"
    ];

    const conf = {};

    for ( const key of keys ) {
        let val = nova.config.get(`com.neelyadav.Stylelint.${key}`);
        if ( val && String(val).startsWith("~/") )
            val = nova.path.expanduser(val);

        conf[key] = val;
    }

    return conf;
}

function newPath() {
    const prefs = getConfigs();
    const env = nova.environment.PATH;

    let newPath = [ env, batteries.dir ];

    if ( prefs["exec.custom"] )
        newPath = [ nova.path.dirname(prefs["exec.path"]) ].concat(newPath);

    return newPath.join(":");
}

async function runProc(command, dir = nova.extension.path) {
    command = command.split(" ");
    const [ cmd, args ] = [ command.shift(), command ];

    const opt = {
        args: args,
        cwd: dir,
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
        proc.onDidExit(status => status === 0 ? resolve(stdout) : resolve(stderr));

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
            if ( status === 0 ) resolve(true);

            else if ( err.includes("configBasedir") ) {
                let cmd = `${process.args.slice(1).map(i => i.replace(/"/g, "")).join(" ")}`;
                cmd += ` --config-basedir ${batteries.dir}`;

                await runProc(cmd, process.cwd)
                    .then(out => resolve("batteries"))
                    .catch(err => {
                        console.error(err);
                        resolve(err.split("\n")[0]);
                    });
            }

            else resolve(false);
        });

        process.start();
    });

    return await config;
}

async function rcWizard(file) {
    const conf = getConfigs();
    const hasRc = await resolveConfig(file);

    if ( ! hasRc ) {
        switch (conf["fallback.behavior"]) {
            case "none":
                notify("noStylelintrc", "No available stylelint config found.", "stylelintrc");
                return null;

            case "ignore":
                return null;

            case "standard":
                return "standard";

            case "custom":
                if ( nova.fs.access(conf["fallback.custom"], nova.fs.F_OK) ) {
                    return conf["fallback.custom"];
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
        const msg = hasRc.substring(7).split(".").map(i => i.trim()).join("\n");
        notify("basedir", msg, "stylelintrc");
        return null;
    }

    else {
        return "continue";
    }
}

module.exports = {
    notify,
    getConfigs,
    rcWizard,
    runProc,
    newPath
};

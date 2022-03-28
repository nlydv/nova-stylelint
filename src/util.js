function notify(id, msg) {
    const notification = new NotificationRequest(id);
    notification.title = "Stylelint";
    notification.body = msg;
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

    const proc = new Promise((resolve, reject) => {
        let stdout, stderr;

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

        const process = new Process("stylelint", opt);
        process.onDidExit(status => status === 0 ? resolve(true) : resolve(false));

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
                notify("noStylelintrc", "Error:\nNo available stylelint config found.");
                return null;

            case null:
            case "ignore":
                return null;

            case "standard":
                return `${nova.extension.path}/Batteries/standard.yaml`;

            case "custom":
                if ( nova.fs.access(conf["fallback.custom"], nova.fs.F_OK) ) {
                    return conf["fallback.custom"];
                } else {
                    notify("nonExistentRc", "Error:\nThe configured fallback stylelintrc config path does not exist.");
                    return null;
                }

            default:
                throw new Error("Unforseen outcome in conditional logic\nPlease open an issue at github.com/nlydv/nova-stylelint");
        }
    }

    return "continue";
}

module.exports = {
    notify,
    getConfigs,
    rcWizard,
    runProc
};

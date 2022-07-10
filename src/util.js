const batteries = require("./batteries");

function alert(message, alt = null) {
    if ( alt ) {
        nova.workspace.showActionPanel(
            message,
            { buttons: [ "OK", alt ] },
            buttonIndex => {
                if ( buttonIndex === 1 ) switch (alt) {
                    case "Settings": return nova.openConfig();
                    // @TODO provide option for adding details in input box within alert itself for less friction
                    case "Report":  return nova.openURL("https://github.com/nlydv/nova-stylelint/issues/new");
                    default: alert("The developer gave you a button that doesn't do anything\n\n...so unprofessional 🙄");
                }
            }
        );
    } else {
        nova.workspace.showErrorMessage(message);
    }
}

function notify(id, msg, type = null) {
    const notification = new NotificationRequest(id);
    notification.title = "Stylelint";
    // @TODO clean the following ternary so its not an unreadable mess of syntactic syrup
    notification.body = type ? `Warning ${type ? `(${type})` : ""}\n\n${msg}` : msg;
    nova.notifications.add(notification);
}

function getPrefs() {
    const prefs = { exec: {}, fallback: {}, cache: {} };

    const val = key => {
        let pref = nova.config.get(`com.neelyadav.Stylelint.${key}`);
        if ( key.endsWith(".path") || key === "basedir" )
            // Rollup didn't like this `&&=` wizardry (mdn ref: https://t.ly/53kW)
            // pref &&= nova.path.normalize(pref);
            pref && (pref = nova.path.normalize(pref));

        return pref;
    };

    // @TODO change 'basedir' to 'basedir.path' so all path args have '.path' ending

    prefs.exec.custom       = val("exec.custom");
    prefs.exec.path         = val("exec.path");
    prefs.fallback.behavior = val("fallback.behavior");
    prefs.fallback.custom   = val("fallback.custom");
    prefs.basedir           = val("basedir");
    prefs.cache.on          = val("cache.on");
    prefs.cache.path        = val("cache.path");

    prefs.stylelint =
        prefs.exec.custom
            ? ( prefs.exec.path ?? "stylelint" )
            : "stylelint";

    return prefs;
}

const relPath = path => nova.workspace.relativizePath(path);

// workaround to get open workspace root, if any, since `nova.workspace.path` doesn't seem to work
function workspacePath() {
    try {
        const active = nova.workspace.activeTextEditor?.document.path;
        if ( active ) return active.split(relPath(active))[0].slice(0, -1);
        else          return null;
    } catch (e) {
        return null;
    }
}

async function newPath(cwd = null) {
    let newPath = [ nova.environment.PATH, batteries.dir ];

    if ( ! cwd ) return newPath.join(":");

    const opt = {
        args: [ "bin" ],
        cwd: cwd,
        env: nova.environment,
        stdio: "pipe",
        shell: "/bin/bash"
    };

    const npxDir = await new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        const proc = new Process("npm", opt);
        proc.onStdout(line => stdout += line.trim());
        proc.onStderr(line => stderr += line.trim());
        proc.onDidExit(status => {
            console.error(stderr);
            status === 0 ? resolve(stdout) : resolve(null);
        });
        proc.start();
    });

    const hasLocalLinter = (
        npxDir
            ? nova.fs.access(nova.path.join(npxDir, "stylelint"), nova.fs.X_OK)
            : false
    );

    if ( hasLocalLinter ) newPath.unshift(npxDir);

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
        shell: "/bin/bash"
    };

    opt.env.PATH = await newPath(opt.cwd);

    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";

        const proc = new Process(cmd, opt);

        // @TODO performance:
        //  • figure out some benchmark tests
        //  • collect listeners below (and elsewhere) in CompositeDisposable and dispose on completion
        //  • see if noticable difference in benchmark performance && iterate

        proc.onStdout(line => stdout += line.trim());
        proc.onStderr(line => stderr += line.trim());
        proc.onDidExit(status => {
            // For debugging purposes
            if ( nova.inDevMode() )
                console.log(`Path: ${opt.env.PATH}\nFrom: ${opt.cwd}\nCmd:  ${command.join(" ")}`);

            status === 0 ? resolve(stdout) : reject(stderr);
        });

        proc.start();
    });
}

module.exports = {
    alert,
    notify,
    getPrefs,
    runProc,
    relPath,
    workspacePath,
    newPath
};

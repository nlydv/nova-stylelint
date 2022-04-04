const batteries = require("./batteries");

function alert(message, settings = false) {
    if ( settings ) {
        nova.workspace.showActionPanel(
            message,
            { buttons: [ "OK", "Settings" ] },
            buttonIndex => buttonIndex === 1 ? nova.openConfig() : null
        );
    } else {
        nova.workspace.showErrorMessage(message);
    }
}

function notify(id, msg, type = null) {
    const notification = new NotificationRequest(id);
    notification.title = "Stylelint";
    notification.body = type ? `Warning ${type ? `(${type})` : ""}\n\n${msg}` : msg;
    nova.notifications.add(notification);
}

function getPrefs() {
    const prefs = { exec: {}, fallback: {}, cache: {} };
    const pathKeys = [ "exec.path", "fallback.custom", "basedir", "cache.path" ];

    const val = key => {
        let pref = nova.config.get(`com.neelyadav.Stylelint.${key}`);
        if ( pref && pathKeys.includes(key) )
            pref = nova.path.normalize(pref);

        return pref;
    };

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
        else return null;
    } catch (e) {
        return null;
    }
}

function newPath() {
    const prefs = getPrefs();
    const env = nova.environment.PATH;

    const workspace      = workspacePath();
    const localBin       = nova.path.join(workspace, "node_modules/.bin");
    const localLinter    = nova.path.join(localBin, "stylelint");
    const hasLocalLinter = nova.fs.access(localLinter, nova.fs.X_OK);

    let newPath = [];

    if ( workspace && localLinter )
        newPath = [ localBin, env, batteries.dir ];
    else
        newPath = [ env, batteries.dir ];

    // newPath.push(env, batteries.dir);
    // if ( prefs.exec.custom )
    //     newPath = [ nova.path.dirname(prefs.exec.path) ].concat(newPath);

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

module.exports = {
    alert,
    notify,
    getPrefs,
    runProc,
    relPath,
    workspacePath,
    newPath
};

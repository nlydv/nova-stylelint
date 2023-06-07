// const batteries = require("./batteries");


export function alert(message: string, alt?: string): void {
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

export function notify(id: string, msg: string, type?: string, file?: string) {
    const notification = new NotificationRequest(id);
    notification.title = "Stylelint";
    notification.body = type
        ? `Warning (${type})\n\n${msg}`
        : msg;
    notification.body += file
        ? `\n\n${relPath(file)}`
        : "";
    nova.notifications.add(notification);
}

export function getPrefs() {
    const inheritGlobal = nova.workspace.config.get("com.neelyadav.Stylelint.local.inherit");

    // @TODO change following key names so all path args end in ".path"
    const pathKeys = [ "basedir", "fallback.custom" ];

    // @TODO convert this (or extract out into own function) for more type-safe config
    // getters that work with the "coerce" param in Nova's API
    function val(key: string) {
        const fullKey = `com.neelyadav.Stylelint.${key}`;

        let pref = (
            inheritGlobal
                ? nova.config.get(fullKey)
                : nova.workspace.config.get(fullKey)
                    ?? nova.config.get(fullKey)
        );

        if ( key.endsWith(".path") || pathKeys.includes(key) )
            pref &&= nova.path.normalize(pref as string);

        return pref;
    }

    // @TODO remove `as <T>` casts when above todo is implemented
    const prefs = {
        getLangs(avail: Set<string>): Set<string> {
            const enabled = new Set<string>().add("css").add("cssplus");
            for (const name of avail)
                val(`lang.${name}`) && enabled.add(name);
            return enabled;
        },
        exec: {
            custom: val("exec.custom") as boolean,
            path: val("exec.path") as string | null,
        },
        fallback: {
            behavior: val("fallback.behavior") as string,
            custom: val("fallback.custom") as string | null,
        },
        cache: {
            on: val("cache.on") as boolean,
            path: val("cache.path") as string | null,
        },
        basedir: val("basedir") as string | null,
        stylelint: "stylelint",
    };

    // prefs.stylelint = (
    //     prefs.exec.custom
    //         ? ( prefs.exec.path ?? "stylelint" )
    //         : "stylelint"
    // );
    if ( prefs.exec.custom )
        prefs.stylelint = prefs.exec.path as string ?? "stylelint";

    return prefs;
}

export function relPath(path: string) {
    return nova.workspace.relativizePath(path);
}

export async function newPath(cwd?: string) {
    const batteryBin = nova.path.join(nova.extension.path, "Batteries", "node_modules", ".bin");
    let newPath = [ nova.environment.PATH, batteryBin ];

    if ( ! cwd ) return newPath.join(":");

    const opt = {
        args: [ "bin" ],
        cwd: cwd,
        env: nova.environment,
        stdio: "pipe" as const,
        shell: "/bin/bash"
    };

    const npxDir: string | null = await new Promise(resolve => {
        let stdout = "";
        const proc = new Process("npm", opt);
        proc.onStdout(line => stdout += line.trim());
        proc.onStderr(console.error);
        proc.onDidExit(status => {
            status === 0 ? resolve(stdout) : resolve(null);
        });
        proc.start();
    });

    // const hasLocalLinter = (
    //     npxDir
    //         ? nova.fs.access(nova.path.join(npxDir, "stylelint"), nova.fs.X_OK)
    //         : false
    // );

    if ( npxDir ) {
        const hasLocalLinter = nova.fs.access(nova.path.join(npxDir, "stylelint"), nova.fs.X_OK);
        hasLocalLinter && newPath.unshift(npxDir);
    }

    return newPath.join(":");
}

export async function runProc(dir: string, cmd: string, ...args: Array<string|string[]>) {
    // if ( args.every(c => c instanceof Array) )
    //     args = args.flat();

    const opt = {
        args: args.flat(),
        cwd: dir ?? nova.extension.path,
        env: nova.environment,
        stdio: "pipe" as const,
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

        proc.onStdout(line => stdout += line);
        proc.onStderr(line => stderr += line);
        proc.onDidExit(status => {
            // For debugging purposes
            if ( nova.inDevMode() )
                console.log(`Path: ${opt.env.PATH}\nFrom: ${opt.cwd}\nCmd:  ${cmd} ${opt.args.join(" ")}`);

            status === 0 ? resolve(stdout) : reject(stderr);
        });

        proc.start();
    });
}

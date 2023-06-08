import * as batteries from "./batteries";
import { getPrefs, relPath, runProc, alert } from "./util";


const enum RC {
    OK,
    BATT_OK,
    BATT_FAIL,
    USER_FAIL,
    NONE
}

async function resolveConfig(file: string) {
    const cwd = nova.path.dirname(file);
    const { basedir, stylelint } = getPrefs();

    async function runCheck(configBaseDir?: string | null) {
        const args = [ "--print-config", file ];
        if ( configBaseDir ) args.push("--config-basedir", configBaseDir);

        // return await runProc(args.join(" "), cwd);
        return await runProc(cwd, stylelint, ...args);
    }

    const resolution = {
        status: RC.NONE,
        error: ""
    };

    try {
        await runCheck(basedir);
        resolution.status = RC.OK;
        return resolution;
    } catch (err1) {
        // `runProc` throws stderr output as string
        if ( typeof err1 !== "string" ) throw err1;
        resolution.error = err1.split("\n")[0].split(/^\w+: /)?.[1] ?? err1;

        // stylelint does NOT find rc, triggers fallback switch
        if ( resolution.error.includes("No configuration provided") ) {
            resolution.status = RC.NONE;
            console.warn(err1);
            return resolution;
        }

        // stylelint finds rc BUT cannot resolve configured plugin/extend packages
        else if ( resolution.error.includes("configBasedir") ) {
            // do not retry by plugging batteries when user-provided basedir fails (unexpected results possible)
            if ( basedir ) {
                resolution.status = RC.USER_FAIL;
                console.warn(err1);
                return resolution;
            } else {
                try { // exact same command again, but with "batteries included"
                    await runCheck(batteries.dir);
                    resolution.status = RC.BATT_OK;
                    return resolution;
                } catch (err2) {
                    resolution.status = RC.BATT_FAIL;
                    // Deliberately not replacing resolution.error with new err2 message...
                    // user should only get original error (err1), which they can remedy; err2
                    // only indicates an inability to provide a convenient fallback when user
                    // config is insufficient.
                    console.error(err1);
                    const pkg = resolution.error.match(/^Could not find "(.+)". Do you need the "configBasedir" or "--config-basedir" option\?$/)?.[1];
                    if ( pkg ) resolution.error = `Missing "${pkg}" package required by Stylelint config.`;
                    return resolution;
                }
            }
        }
    }

    return resolution;
}

export async function rcWizard(file: string) {
    const prefs = getPrefs();
    const { status, error } = await resolveConfig(file);

    if ( status === RC.NONE ) {
        switch ( prefs.fallback.behavior ) {
            case "silent": // back compat <3.0.0
            case "ignore":
                return null;

            case "standard":
                return "standard";

            case "custom":
                if ( prefs.fallback.custom && nova.fs.access(prefs.fallback.custom, nova.fs.F_OK) ) {
                    return "custom";
                } else {
                    alert("rc", msg.enoent("Fallback config", prefs.fallback.custom), "Settings");
                    return null;
                }

            default:
            case "quiet": // back compat <3.0.0
            case "load": // back compat <3.0.0
            case "notify":
                alert("noConfig", `No Stylelint config found\n\n${relPath(file)}`, "Settings");
                return null;
        }
    }

    else if ( status === RC.BATT_OK ) {
        return "batteries";
    }

    else if ( status === RC.BATT_FAIL ) {
        // resolveConfig() passed configBasedir error forward, now we pass to user
        const message = error + "\n" + msg.naivePkg;
        alert("rc", message, "Settings");

        return null;
    }

    else if ( status === RC.USER_FAIL ) {
        let message = error;
        if ( prefs.basedir )
            message += "\n" + msg.basedirPkg(prefs.basedir);
        alert("rc", message, "Settings");
        return null;
    }

    else {
        return "continue";
    }

    // return value semantics
    //
    // null        => tell execLinter() to abort
    // "continue"  => tell execLinter() to run naively
    // "batteries" => tell execLinter() to run with built-in basedir
    // "standard"  => no rc found; have execLinter() use stylelint-config-standard
    // "custom"    => no rc found; have execLinter() use user-defined rc path
}

const msg = {
    // @TODO factor out all feedback messages/alerts/prompts into dedicated module

    enoent: (type: string, path: string | null) => `${type} path does not exist:\n\n"${path ?? ""}"`,

    basedirPkg: (configBasedir: string) => `
We tried looking for this package in your configBasedir:
${configBasedir}

Double check that the package is installed there.
Alternatively, try installing the package globally.`,

    naivePkg: "\nTry locally installing this package in your project. Alternatively, set a Config Basedir in settings."
};

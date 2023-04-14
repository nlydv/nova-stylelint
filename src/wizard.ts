import * as batteries from "./batteries";
import { getPrefs, relPath, runProc, alert, notify } from "./util";


enum RC {
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
        resolution.error = err1.split("\n")[0].split(/^\w+: /)[1];

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
                    console.warn(err1);
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
        const message = `No available stylelintrc config file found\n\n${relPath(file)}`;

        switch ( prefs.fallback.behavior ) {
            case "none": // back compat (v1.0.4)
            case "loud":
                alert(message);
                return null;

            case "quiet":
                notify("noStylelintrc", message, "stylelintrc");
                return null;

            case "ignore": // back compat (v1.0.4)
            case "silent":
                return null;

            case "standard":
                return "standard";

            case "custom":
                if ( prefs.fallback.custom && nova.fs.access(prefs.fallback.custom, nova.fs.F_OK) ) {
                    return "custom";
                } else {
                    alert(msg.enoent("Fallback config", prefs.fallback.custom), "Settings");
                    return null;
                }

            default:
                // @TODO create custom Error class for standardized catching/handling in downstream code
                throw new Error("Unforseen outcome in conditional logic\n\nPlease open an issue report in the GitHub repository");
        }
    }

    else if ( status === RC.BATT_OK ) {
        return "batteries";
    }

    else if ( status === RC.BATT_FAIL ) {
        // resolveConfig() passed configBasedir error forward, now we pass to user
        const message = error + "\n" + msg.naivePkg;
        alert(message, "Settings");

        return null;
    }

    else if ( status === RC.USER_FAIL ) {
        let message = error;
        if ( prefs.basedir )
            message += "\n" + msg.basedirPkg(prefs.basedir);
        alert(message, "Settings");
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

    naivePkg: `
Try installing this package to your project locally.
Alternatively, set a Config Basedir in settings.`
};

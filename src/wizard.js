const batteries = require("./batteries");
const { getPrefs, relPath, runProc, alert, notify } = require("./util");


const rc = {
    OK:        "A0",
    BATT_OK:   "B0",
    BATT_FAIL: "B1",
    USER_FAIL: "C1",
    NONE:      "FF"
};

async function resolveConfig(file) {
    const cwd = nova.path.dirname(file);
    const { basedir, stylelint } = getPrefs();

    async function runCheck(configBaseDir = null ) {
        const args = [ stylelint, "--print-config", file ];
        if ( configBaseDir ) args.push("--config-basedir", configBaseDir);

        return await runProc(args.join(" "), cwd);
    }

    const resolution = {
        status: rc.NONE,
        error: ""
    };

    try {
        await runCheck(basedir);
        resolution.status = rc.OK;
        return resolution;
    } catch (err1) {
        resolution.error = err1.split("\n")[0].split(/^\w+: /)[1];

        // stylelint does NOT find rc, triggers fallback switch
        if ( resolution.error.includes("No configuration provided") ) {
            resolution.status = rc.NONE;
            return resolution;
        }

        // stylelint finds rc BUT cannot resolve configured plugin/extend packages
        else if ( resolution.error.includes("configBasedir") ) {
            // do not retry by plugging batteries when user provided basedir failed (unexpected results possible)
            if ( basedir ) {
                resolution.status = rc.USER_FAIL;
                resolution.error = err1.split("\n")[0];
                console.warn(err1);
                return resolution;
            } else {
                try { // exact same command again, but with "batteries included"
                    await runCheck(batteries.dir);
                    resolution.status = rc.BATT_OK;
                    return resolution;
                } catch (err2) {
                    resolution.status = rc.BATT_FAIL;
                    resolution.error = err1.split("\n")[0];
                    console.warn(err1);
                    // battery resolution errors are internal, would only confuse users
                    if ( nova.inDevMode() ) console.warn(err2);
                    return resolution;
                }
            }
        }
    }
}

async function rcWizard(file) {
    const prefs = getPrefs();
    const { status, error } = await resolveConfig(file);

    if ( status === rc.NONE ) {
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
                if ( nova.fs.access(prefs.fallback.custom, nova.fs.F_OK) ) {
                    return "custom";
                } else {
                    alert(msg.enoent("Fallback config", prefs.fallback.custom), "Settings");
                    return null;
                }

            default:
                // @TODO create custom Error class for standardized catching/handling in upstream code
                throw new Error("Unforseen outcome in conditional logic\n\nPlease open an issue report in the GitHub repository");
        }
    }

    else if ( status === rc.BATT_OK ) {
        return "batteries";
    }

    else if ( status === rc.BATT_FAIL ) {
        // resolveConfig() passed configBasedir error forward, now we pass to user
        let message = error.substring(7).split(".")[0] + "\n";
        message += ( prefs.basedir ? msg.basedirPkg(prefs) : msg.naivePkg );
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

    enoent: (type, path) => `${type} path does not exist:\n\n"${path}"`,

    basedirPkg: prefs => `
We tried looking in your Config Basedir:
"${prefs.basedir}"

Double check that the package is installed there.
Alternatively, try installing the package globally.`,

    naivePkg: `
Try installing this package to your project locally.
Alternatively, set a Config Basedir in settings.`
};

module.exports = { rcWizard };

const batteries = require("./batteries");
const { getPrefs, relPath, newPath, runProc, alert, notify } = require("./util");

function resolveConfig(file) {
    const config = new Promise((resolve, reject) => {
        const { basedir, stylelint } = getPrefs();

        const opt = {
            args: [ "--print-config", file ],
            cwd: nova.path.dirname(file),
            env: nova.environment,
            stdio: "pipe",
            shell: true
        };

        opt.env.PATH = newPath();

        if ( basedir )
            opt.args.push("--config-basedir", basedir);

        const process = new Process(stylelint, opt);

        // For debugging purposes
        if ( nova.inDevMode() )
            console.log(`From: ${process.cwd}\nCmd:  ${process.args.slice(1).map(i => i.replace(/"/g, "")).join(" ")}`);

        let err = "";
        process.onStderr(line => err += line);
        process.onDidExit(status => {
            // stylelint finds rc AND is able to lint properly
            if ( status === 0 ) resolve(true);

            // stylelint finds rc BUT cannot resolve configured plugin/extend packages
            else if ( err.includes("configBasedir") ) {
                // do not attempt naive basedir resolution when user provides own;
                // immediately throw error at user
                if ( basedir ) {
                    console.warn(err);
                    resolve(err.split("\n")[0]);
                    return;
                }

                // retry exact same command again, but with "batteries included" folder as basedir
                let cmd = process.args[1] + ` "--config-basedir" "${batteries.dir}"`;

                // For debugging purposes
                if ( nova.inDevMode() )
                    console.log(`From: ${process.cwd}\nCmd:  ${cmd}`);

                runProc(cmd, process.cwd)
                    .then(out => resolve("batteries")) // if we do have the batteries stylint wants, let downstream proc know to use them
                    .catch(err => {
                        console.warn(err);
                        resolve(err.split("\n")[0]);
                    });
            }

            // stylelint does NOT find rc, trigger fallback switch
            else resolve(false);
        });

        process.start();
    });

    return config;
}

async function rcWizard(file) {
    const prefs = getPrefs();
    const hasRc = await resolveConfig(file);

    if ( ! hasRc ) {
        const message = `No available stylelintrc config file found\n\n${relPath(file)}`;

        switch (prefs.fallback.behavior) {
            case "none": // back compat (v1.0.4)
            case "loud":
                alert(message);
                // Commented out in favor of alert specifically for error messages. Look into
                // switching back to "showActionPanel" later to enable additional alert button
                // to allow user to ignore file by adding it to a `.stylelintignore`-type pref.
                /*
                nova.workspace.showActionPanel(
                    message,
                    { buttons: [ "Ok", "Don't show again" ] },
                    buttonIndex => buttonIndex === 1 ? nova.config.set("com.neelyadav.Stylelint.fallback.behavior", "silent") : null
                );
                */
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

    else if ( hasRc === "batteries" ) {
        return "batteries";
    }

    else if ( hasRc.toString().includes("configBasedir") ) {
        // resolveConfig() passed configBasedir error forward, now we pass to user
        let message = hasRc.substring(7).split(".")[0] + "\n";
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
Try installing the missing package globally.
Alternatively, set a Config Basedir in settings.`
};

module.exports = { rcWizard };

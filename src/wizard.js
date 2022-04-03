const batteries = require("./batteries");
const { getPrefs, newPath, runProc, notify } = require("./util");

function resolveConfig(file, exec = "stylelint") {
    const config = new Promise((resolve, reject) => {
        const { basedir } = getPrefs();

        const opt = {
            args: ["--print-config", file],
            cwd: nova.path.dirname(file),
            env: nova.environment,
            stdio: "pipe",
            shell: true
        };

        opt.env.PATH = newPath();

        if (basedir)
            opt.args.push("--config-basedir", basedir);

        const process = new Process(exec, opt);

        // For debugging purposes
        if (nova.inDevMode())
            console.log(`From: ${process.cwd}\nCmd:  ${process.args.slice(1).map(i => i.replace(/"/g, "")).join(" ")}`);

        let err = "";
        process.onStderr(line => err += line);
        process.onDidExit(status => {
            // stylelint finds rc AND is able to lint properly
            if (status === 0)
                resolve(true);


            // stylelint finds rc BUT cannot resolve configured plugin/extend packages
            else if (err.includes("configBasedir")) {
                // do not attempt naive basedir resolution when user provides own; immediately throw error at user
                if (basedir) {
                    console.warn(err);
                    resolve(err.split("\n")[0]);
                    return;
                }

                let cmd = process.args[1].split('" "').join(" ").slice(1, -1); // retry exact same command again, but with...
                cmd += ` --config-basedir ${batteries.dir}`; // "batteries included" folder as basedir to see if we have what it needs

                runProc(cmd, process.cwd)
                    .then(() => {
                        // For debugging purposes
                        if (nova.inDevMode())
                            console.log(`From: ${process.cwd}\nCmd:  ${cmd}`);
                    })
                    .then(out => resolve("batteries")) // if we do have the batteries stylint wants, let downstream proc know to use them
                    .catch(err => {
                        console.warn(err);
                        resolve(err.split("\n")[0]);
                    });
            }


            // stylelint does NOT find rc, trigger fallback switch
            else
                resolve(false);
        });

        process.start();
    });

    return config;
}

async function rcWizard(file) {
    const prefs = getPrefs();
    const exec = (prefs.exec.custom
        ? (prefs.exec.path ?? "stylelint")
        : "stylelint"
    );

    const hasRc = await resolveConfig(file, exec);

    if (!hasRc) {
        switch (prefs.fallback.behavior) {
            case "none":
                notify("noStylelintrc", "No available stylelint config found.", "stylelintrc");
                return null;

            case "ignore":
                return null;

            case "standard":
                return "standard";

            case "custom":
                if (nova.fs.access(prefs.fallback.custom, nova.fs.F_OK)) {
                    return "custom";
                } else {
                    notify("nonExistentRc", "The configured fallback stylelintrc config path does not exist.", "config");
                    return null;
                }

            default:
                throw new Error("Unforseen outcome in conditional logic.\n\nPlease open an issue at:\ngithub.com/nlydv/nova-stylelint");
        }
    }

    else if (hasRc === "batteries") {
        return "batteries";
    }

    else if (hasRc.toString().includes("configBasedir")) {
        // resolveConfig() passed configBasedir error forward, now we pass to user
        let msg = hasRc.substring(7).split(".").map(i => i.trim()).join("\n");

        if (prefs.basedir) {
            msg = msg.split("\n")[0] + "\n\nEither install missing package globally or in `config-basedir`";
            notify("basedir", msg, "stylelintrc");
        }

        return null;
    }

    else {
        return "continue";
    }

    // return value semantics
    // null        => tell execLinter() to abort
    // "continue"  => tell execLinter() to run naively
    // "batteries" => give execLinter() the go-ahead but use built-in basedir
    // "standard"  => no rc found; have execLinter() use stylelint-config-standard
    // "custom"    => no rc found; have execLinter() use user-defined rc path
}

module.exports = { rcWizard };

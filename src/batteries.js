const { runProc, alert } = require("./util");


let cache    = nova.path.join(nova.extension.globalStoragePath, "/Cache/");
let dir      = nova.path.join(nova.extension.path, "Batteries");
let bin      = nova.path.join(dir, "node_modules", ".bin");
let standard = nova.path.join(dir, "standard.yaml");
let linter   = nova.path.join(bin, "stylelint");

function install() {
    console.log("Waiting for initial extension installation to complete...");

    return runProc(dir, "/usr/bin/env", "npm", "ci", "--legacy-peer-deps=false")
        .then(npm => console.log(npm))
        .then(success => console.log("...installed successfully."))
        .then(resolve => true)
        .catch(error => {
            // @TODO factor out all feedback messages/alerts/prompts into dedicated module
            const note = "Extension installation exited unexpectedly\n"
            + "\n"
            + "Check the Extension Console for any clues. If the problem persists, try uninstalling and reinstalling the extension.\n"
            + "\n"
            + "If you get tired of seeing this alert, let the developer know by reporting the issue in the GitHub repository.";

            alert(note, "Report");
            console.error(error);
            return false;
        });
}

function areInstalled() {
    return nova.fs.access(linter, nova.fs.X_OK);
}

async function kickstart() {
    if ( areInstalled() )
        return true;
    else {
        for ( let attempt = 1; attempt <= 3; attempt++ ) {
            if ( await install() ) return true;
            else console.warn(`Extension installation failed on attempt ${attempt}.`);
        }

        if ( ! areInstalled() ) {
            // @TODO: factor out all user feedback
            const title = "Activation Error";
            const msg = "Extension dependency installation aborted after 3 failed attempts.";
            const hint = "Make sure Node.js and npm are installed and that Nova is able access both CLIs through your $PATH environment variable.";

            alert(`${title}\n\n${msg}\n\n${hint}`, "Report");
            return false;
        }
    }
}

module.exports = {
    dir,
    bin,
    kickstart,
    install,
    areInstalled,
    standard,
    cache,
    linter
};

const { runProc, alert } = require("./util");


let cache    = nova.path.join(nova.extension.globalStoragePath, "/Cache/");
let dir      = nova.path.join(nova.extension.path, "Batteries");
let bin      = nova.path.join(dir, "node_modules", ".bin");
let standard = nova.path.join(dir, "standard.yaml");
let linter   = nova.path.join(bin, "stylelint");

async function kickstart() {
    function check() {
        return nova.fs.access(linter, nova.fs.X_OK);
    }

    function unpack() {
        console.log("Waiting for initial extension installation to complete...");

        return runProc(dir, "/usr/bin/env", "npm", "ci")
            .then(npm => console.log(npm))
            .then(success => console.log("...installed successfully."))
            .then(resolve => true)
            .catch(err => {
                console.error(err);
                return false;
            });
    }

    async function init() {
        for ( let n = 1; n <= 3; n++ ) {
            if ( await unpack() ) {
                return true;
            } else {
                console.warn(`Extension installation failed on attempt ${n}.`);
            }
        }

        return check();
    }

    function fatal() {
        // @TODO: factor out all user feedback
        const title = "Activation Error";
        const msg = "Extension dependency installation aborted after 3 failed attempts.";
        const hint = "Make sure Node.js and npm are installed and that Nova is able access both CLIs through your $PATH environment variable.";

        alert(`${title}\n\n${msg}\n\n${hint}`, "Report");
        return false;
    }

    return check() || await init() || fatal();
}

module.exports = {
    dir,
    bin,
    kickstart,
    // install,
    // areInstalled,
    standard,
    cache,
    linter
};

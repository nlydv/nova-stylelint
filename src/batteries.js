const { runProc, alert } = require("./util");


let cache         = nova.path.join(nova.extension.globalStoragePath, "/Cache/");
let dir           = nova.path.join(nova.extension.path, "Batteries");
let bin           = nova.path.join(dir, "node_modules", ".bin");
let standard      = nova.path.join(dir, "standard.yaml");
let stylelintPath = nova.path.join(bin, "stylelint");

async function install() {
    return runProc("/usr/bin/env npm ci", dir)
        .then(i => console.log(i))
        .then(b => true)
        .catch(e => alert(
            // @TODO factor out all feedback messages/alerts/prompts into dedicated module
            "Extension installation exited unexpectedly\n"
            + "\n"
            + "Check the Extension Console for any clues. If the problem persists, try uninstalling and reinstalling the extension.\n"
            + "\n"
            + "If you get tired of seeing this alert, let the developer know by reporting the issue in the GitHub repository.",
            "Report"
        ));
}

function areInstalled() {
    return nova.fs.access(stylelintPath, nova.fs.X_OK);
}

module.exports = {
    dir,
    bin,
    install,
    areInstalled,
    standard,
    cache,
    stylelintPath
};

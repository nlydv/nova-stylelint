import { runProc, alert } from "./util";

export let cache    = nova.path.join(nova.extension.globalStoragePath, "/Cache/");
export let dir      = nova.path.join(nova.extension.path, "Batteries");
export let bin      = nova.path.join(dir, "node_modules", ".bin");
export let standard = nova.path.join(dir, "standard.yaml");
export let linter   = nova.path.join(bin, "stylelint");

export async function kickstart() {
    const check = () => nova.fs.access(linter, nova.fs.X_OK);

    if ( ! check() ) {
        console.log("Waiting for initial extension installation to complete...");

        await runProc(dir, "/usr/bin/env", "npm", "ci", "--legacy-peer-deps=false")
            .then(npm => {
                console.log(npm);
                console.log("...installed successfully.");
            })
            .catch(e => console.error(`Extension installation failed: ${e}`));

        if ( ! check() ) {
            // @TODO: factor out all user feedback
            const title = "Activation Error";
            const msg = "Extension dependency installation was unsuccessful.";
            const hint = "Make sure Node.js and npm are installed and that Nova is able to access both CLIs through your $PATH environment variable.";

            alert("batteries", `${title}\n\n${msg}\n\n${hint}`, "Report");
            return false;
        }
    }

    return true;
}

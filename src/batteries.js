const { runProc } = require("./util");

let cache         = nova.path.join(nova.extension.globalStoragePath, "/Cache/");
let dir           = nova.path.join(nova.extension.path, "Batteries");
let bin           = nova.path.join(dir, "node_modules", ".bin");
let standard      = nova.path.join(dir, "standard.yaml");
let stylelintPath = nova.path.join(bin, "stylelint");

const install = async () => await runProc("/usr/bin/env npm ci", dir).catch(err => console.error(err));
const areInstalled = () => nova.fs.access(stylelintPath, nova.fs.X_OK);

module.exports = {
    dir,
    bin,
    install,
    areInstalled,
    standard,
    cache,
    stylelintPath
};

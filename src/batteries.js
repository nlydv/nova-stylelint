const { runProc } = require("./util");

let cache         = `${nova.extension.globalStoragePath}/Cache/`;
let dir           = nova.path.join(nova.extension.path, "Batteries");
let bin           = nova.path.join(dir, "node_modules", ".bin");
let standard      = `${dir}/standard.yaml`;
let stylelintPath = `${bin}/stylelint`;

const install = async () => await runProc("npm install --production", dir).catch(err => console.error(err));
const areInstalled = () => nova.fs.access(stylelintPath, nova.fs.X_OK);

module.exports = {
    dir,
    bin,
    install,
    areInstalled,
    standard,
    cache
};

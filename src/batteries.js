const { runProc } = require("./util");

const dir = nova.path.join(nova.extension.path, "Batteries");
const bin = nova.path.join(dir, "node_modules", ".bin");
const stylelintPath = `${bin}/stylelint`;

const install = async () => await runProc("npm install --production", dir).catch(err => console.error(err));

const areInstalled = () => nova.fs.access(stylelintPath, nova.fs.X_OK);

module.exports = {
    dir,
    bin,
    install,
    areInstalled
};

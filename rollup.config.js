const commonjs = require("@rollup/plugin-commonjs");
const resolve = require("@rollup/plugin-node-resolve");

/** @type {import("rollup").RollupOptions} */
const config = {
    input: "src/main.js",

    plugins: [
        commonjs(),
        resolve()
    ],

    output: {
        file: "Stylelint.novaextension/Scripts/main.dist.js",
        format: "cjs"
    },

    external: [
        "stylelint",
        "stylelint-config-standard",
        "stylelint-scss"
    ],

    acorn: {
        ecmaVersion: "2022"
    }
};

module.exports = config;

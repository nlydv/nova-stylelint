const commonjs = require("@rollup/plugin-commonjs");
const resolve = require("@rollup/plugin-node-resolve");
const json = require("@rollup/plugin-json");

module.exports = [
    {
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
            ecmaVersion: "2021"
        }
    }
];

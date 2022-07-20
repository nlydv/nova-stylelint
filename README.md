# Nova Stylelint

[Stylelint](https://stylelint.io) extension for [Nova](https://nova.app), a new macOS-native code editor from [Panic](https://panic.com), that presents real-time stylesheet linting results with inline and sidebar warnings by plugging into Nova's built-in issue provider system.

![](https://raw.githubusercontent.com/nlydv/nova-stylelint/master/preview.png)

## Features

- Inline and sidebar linting results
- Validates files on change
- Command & menu item to autofix all issues (shortcut **⌥F** by default)
- Enable/disable linting of individual syntax types
- Ability to set preferences per-project as well as globally
- Option to configure a global fallback `stylelintrc` config to use when none is found, or use the bundled standard config instead
- Option to set a `--config-basedir` for Stylelint to use in resolving dependencies
- Able to lint CSS and Sass/SCSS files [out-of-the-box](#batteries-included) in absence of common user-installed plugins, rulesets, or custom syntax modules

## Setup

The only requirement to being able to use this extension is having Node.js installed on your system.

If you don't already have Node.js installed, the quickest way to get up and running is to install Stylelint through [Homebrew](https://brew.sh):
```
brew install node
```

For more granular control over managing Node.js installation(s), also checkout [*nvm*](https://github.com/nvm-sh/nvm). Note however, that if you have Node.js installed via *nvm* while simultaneously having a copy of Node installed via Homebrew, you're likely to run into problems sooner or later.

> *I'm assuming you are at least somewhat familiar with Stylelint and using Node packages. If not, or if you're running into issues with this extension, see the [Environment Setup](#environment-setup) section near the bottom of this README for more details.*

## Install

Depending on which digital wormhole you traveled through to find this document, you may have already passed the `Install` button on your way down here.

Otherwise, open Nova and from the menu bar `Extensions > Extension Library` then search for *Stylelint*... or if you want to save, like, 5 extra seconds, you can click [this link](https://panic.com/open-in-nova/extension/?id=com.neelyadav.stylelint) on your Mac to automatically open the extension page within Nova (assuming you have Nova installed).

## Usage

Currently, the extension will activate and lint CSS, SCSS, Sass, and Less files only. You can individually enable/disable linting of each of those languages in the extension preferences.

Any global extension preferences available can also be set on a per-workspace basis. When configuring workspace-specific preferences for this extension, you can additionally disable linting all together (i.e. disables the extension in that project only).

### Configuration

You'll want to have a `stylelintrc` configuration file within a project directory (or any of its parent directories, see the [Stylelint docs](https://stylelint.io) for more info).

When editing stylesheet files without an accessible `stylelintrc`, you can set the desired behavior in the extension preferences. By default an error alert is presented in that situation, but if you like you can change this to be less obstructive, silenced, or automatically fallback to linting with an alternative config file.

Discovery of stylelintrc config files for a given stylesheet—as well as finding any external plugin packages your config requires—should otherwise function just the same as if you were running stylelint yourself from the command line.

### Plugins

If your stylelintrc config requires external packages (e.g. [stylelint-order](https://github.com/hudochenkov/stylelint-order) or [stylelint-config-primer](https://github.com/primer/stylelint-config)) via the `plugins`, `extends`, `customSyntax`, or other properties, then you'll need to make sure that those packages are accessible to Stylelint somehow. Ideally by installing those packages along with Stylelint itself in your local project.

#### Batteries Included

This extension comes pre-installed with some common plugins, rulesets, and syntax modules:
- `stylelint-config-recommended`
- `stylelint-config-standard`
- `stylelint-config-recommended-scss`
- `stylelint-config-standard-scss`
- `stylelint-scss`
- `postcss-scss`
- `postcss-sass`
- and any other plugins that are dependencies of the above

This is to make it easier to lint and use a global/personal config file outside of a dedicated project environment. For example, if you wanted to quickly lint a standalone stylesheet file outside of any project workspace using Stylelint from the command line, you'd have to set flags for `--config` and `--config-basedir` to make it work.

Setting the extension to use a static config path as a fallback would resolve the first part, and then the extension will automatically try to handle the second part: when your fallback config's required plugins are not all normally discoverable by Stylelint, the extension will try pointing to this bundled set of packages to see if it includes what is missing and then proceed with linting if so.

If you have a separate directory of installed linter plugins for whatever reason, you can configure the extension to *always* pass that path to Stylelint's `--config-basedir` flag in the extension or workspace preferences.

Whenever the above processes are unable to find any packages required by your config, an error alert will popup with additional information.

#### Environment Setup

For the best results, it's recommended that you install any external packages your config requires, along with Stylelint itself, locally via npm in the project(s) you're working on, even if already installed globally:
```sh
cd your-project
npm i -D stylelint # and all other packages your config requires
```

The reason installing locally is recommend is due to some constraints Stylelint has when using custom syntax modules (plugins that enable you to lint files other than plain CSS such as SCSS, Less, HTML, etc). Specifically, the installed Stylelint package being used needs to be in the same location as any custom syntax modules it tries to use. Even if you don't explicitly install or configure custom syntax modules, you're almost certainly using them whenever linting non-CSS files.

Additionally, while you could technically install any Stylelint-related packages exclusively in your global npm store, that would make it difficult to share and collaborate on a project... and harder to manage dependencies across multiple projects. Inevitably, you'll have to start moving some packages locally and once you split dependencies between global and local, problems are likely to arise.

## Development

### Ideas

<sup>*In no particular order*</sup>

**✓** Add `fix` command

**□** Figure out why stylelint caching is weird and implement

**□** Out-of-the-box support for CSS embedded in HTML, PHP, JS, etc. syntaxes

**□** Option to toggle between linting `onSave` and `onChange`

**□** Configurable delay before execution (on top of built-in)

**□** Autofix on save option

**□** Task template for build pipelines `??`

**□** Single issue fix command `?`

**✓** Enable workspace-specific preferences

**□** Auto-substitute indent spacing rule with values set within Nova itself

~~**□** Options to skip linting of certain files (e.g. `vendor`, `node_modules`, etc.)~~

### Contribute

Always open to feedback, bug fixes, PRs, suggestions, or whatever:
<br>[`nlydv/nova-stylelint`](https://github.com/nlydv/stylelint)

Feel free to also reach out to me on Twitter:
<br>[`@nlydv`](https://twitter.com/nlydv)

## License

Copyright © 2022 [Neel Yadav](https://neelyadav.com)
<br>MIT License

Full license text is available in the [LICENSE.md](https://github.com/nlydv/nova-stylelint/blob/master/LICENSE.md) file.

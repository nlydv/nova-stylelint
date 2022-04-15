# Nova Stylelint

[Stylelint](https://stylelint.io) extension for [Nova](https://nova.app), a new macOS-native code editor from [Panic](https://panic.com).

![](https://raw.githubusercontent.com/nlydv/nova-stylelint/master/preview.png)

## Overview

This extension presents real-time stylesheet linting results with inline and sidebar warnings by plugging into Nova's built-in issue provider system. It works [out-of-the-box](#batteries-included) for CSS, SCSS, and SASS files without requiring external plugins, rulesets, or custom syntaxes.

### Requirements

If you already have Stylelint installed on your system, you're good to go! Otherwise, as long as you have an installation of Node.js and npm on your Mac that is accessible via your `$PATH` variable, you shouldn't need to install anything else.

However, if you don't have Node.js installed, the quickest way to get up and running is to install Stylelint through [Homebrew](https://brew.sh):
```
brew install stylelint
```

This will also install Node.js as a dependency of Stylelint if you don't already have it.

### Install

Depending on which digital wormhole you traveled through to find this document, you may have already passed the `Install` button on your way down here.

Otherwise, open Nova and from the menu bar `Extensions > Extension Library` then search for _Stylelint_.

Or you could harness the awesome power that is ***21st century technology*** and save like 5 extra seconds by right-clicking the URI below and selecting `Services > Open URL`
```
nova://extension/?id=com.neelyadav.stylelint&name=Stylelint
```

## Usage

### Configuration

You'll also want to have a `stylelintrc` configuration file within a project directory (or any of its parent directories, see the [Stylelint docs](https://stylelint.io) for more info).

When editing stylesheet files without an accessible `stylelintrc`, you can set the desired behavior in the extension preferences. By default an error alert is presented in that situation, but if you like you can change this to be less obstructive, silenced, or automatically fallback to linting with an alternative config file.

Discovery of stylelintrc config files for a given stylesheet—as well as resolution of any plugins/extends set within—should otherwise function just the same as if you were running stylelint yourself from the command line.

### Plugins

If your stylelintrc config requires external packages (e.g. [stylelint-order](https://github.com/hudochenkov/stylelint-order) or [stylelint-config-primer](https://github.com/primer/stylelint-config)) via the `plugins`, `extends`, `customSyntax`, or other properties, then you'll need to make sure that those packages are accessible to Stylelint somehow.

#### Batteries Included

This extension comes pre-installed with some common plugins and rulesets:
* `stylelint-config-recommended`
* `stylelint-config-standard`
* `stylelint-config-recommended-scss`
* `stylelint-config-standard-scss`
* `stylelint-scss`
* `postcss-scss`
* any other plugins that are dependencies of the above

If your config's required plugins are not all normally discoverable by Stylelint, the extension will automatically try pointing to this pre-installed set to see if it includes what is missing and proceed with linting if so.

For other plugins the easiest way to install them is globally via npm. This way Stylelint can always find your external plugins/configs from anywhere:
```
npm install -g <PACKAGE>
```

If you have stylelint packages installed at the project-level (e.g. as a `devDependency`), then as long your relevant `.stylelintrc` config is within the same project, you should be fine.

Lastly, if you're like me and have a separate directory to install linter plugins so not to clutter up your global npm store, or for whatever other reason, you can configure that path in the extension preferences to pass it on to Stylelint's `--config-basedir` flag.

An error alert will popup whenever the above processes could not find any packages required by your config.

## Other

### Ideas
> In no particular order

- [X]  Add `fix` command
- [ ]  Figure out why stylelint caching is weird
- [ ]  Out-of-the-box support for inline CSS in HTML, JS files
- [ ]  Option to toggle between linting `onSave` and `onChange`
- [ ]  Configurable delay before execution (on top of built-in)
- [ ]  Autofix on save option
- [ ]  Task template for build pipelines `??`
- [ ]  Single issue fix command `?`
- [ ]  Enable workspace-specific preferences
- [ ]  Auto-substitute indent spacing rule with values set within Nova itself
- [ ]  Options to skip linting of certain files (e.g. `vendor`, `node_modules`, etc.)

### Note

Quick confession, I'm still on my 30-day free trial of Nova and haven't actually decided whether or not I'm going to switch to it as a primary editor. Creating a plugin to fill a gap in the tools I'm used to having is definitely a good way to get a proper feel for an editor though!

### Contribute

Always open to feedback, bug fixes, PRs, suggestions, or whatever:
<br>[`nlydv/nova-stylelint`](https://github.com/nlydv/stylelint)

Feel free to also reach out to me on Twitter:
<br>[`@nlydv`](https://twitter.com/nlydv)

## License

Copyright © 2022 [Neel Yadav](https://neelyadav.com)

This project is licensed under the terms of the MIT License.
<br>Full license text is available in the [LICENSE.md](https://github.com/nlydv/nova-stylelint/blob/master/LICENSE.md) file.

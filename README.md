# Nova Stylelint

A [Stylelint](https://stylelint.io) extension for [Nova](https://nova.app), a new macOS-native code editor from [Panic](https://panic.com).

![](https://nova.app/images/en/dark/editor.png)
<div style="text-align: center;"><sup>Stock image from Nova's extension template generator. Ironic in that it depicts linting a CSS file despite there not being any stylesheet linter available. It's till accurate for this extension though, so I'll keep it utill I take a nice screenshot.</sup></div>

## Overview

This extension provides warnings on stylesheet files (CSS, SCSS, SASS, & LESS) both inline and in a sidebar summary through Nova's built-in issue/validator system.

## Requirements

As long as you have NodeJS and NPM installed on your mac (accessible via your `$PATH`), and regardless of whether you already have Stylelint installed or not, you'll be good to go with this extension right out-of-the-box!

If that's not the case you can easily install Node/NPM and Stylelint quickly just by installing Stylelint through Homebrew:
```
brew install stylelint
```

Of course, you'll should also have a `stylelintrc` configuration file within your project directory or any of its parent directories (see the [Stylelint docs](https://stylelint.io) for more info).

If you don't however, you can chose to fallback to using the `stylelint-config-standard` ruleset instead through the extension preferences.

## Misc
### TODO

* Write README info about plugins.
* Provide more config/setup info in README
* Stress test weird edge cases.
* Use extension for day-to-day editing.
* Document build workflow.

### Contribute

Always open to feedback, bug fixes, PRs, suggestions, or whatever: <br>[`nlydv/nova-stylelint`](https://github.com/nlydv/stylelint)

Feel free to also reach out to me on Twitter: <br>[`@nlydv`](https://twitter.com/nlydv)

## License

Copyright © 2022 [Neel Yadav](https://neelyadav.com)

_This project is licensed under the terms of the MIT License._ <br>_Full license text is available in the [LICENSE.md](https://github.com/nlydv/nova-stylelint/blob/master/LICENSE.md) file._

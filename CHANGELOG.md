# Nova Stylelint Changelog
I'll try to keep up with documenting changes here in this file.

## v2.0.1
`July 26, 2022`

### Fixed
- Useless popup alerts for uncaught errors reading `undefined undefined`

### Changed
- Catch, parse, and display certain "meta issues" such as parsing, syntax, and config errors

## v2.0.0
`July 19, 2022`

### Added
- Options to individually enable/disable linting of file types other than plain CSS
- Local workspace configuration options mirroring global preferences
- Workspace-specific option to disable extension in current project

### Fixed
- Inability to discover and prefer locally installed Stylelint package, in some cases
- Inconsistent module resolution and error reporting in deeply nested projects [#2](https://github.com/nlydv/nova-stylelint/issues/2)
- Built-in stylelint executable not usable as final fallback
- Path type user configs no longer working with `~/` prefixed inputs

### Changed
- Upgrade inline issue "squigglies" to extend under applicable text range rather than only at discrete points
- More robust module resolution, error handling, and information feedback
- Improvements in performance/speed

## v1.1.0
`April 14, 2022`

### Added
- Commands for issue fixing and manually linting active stylesheet

### Fixed
- Elusive bug related to unescaped spaces in file paths
- Sporadic/jittery behavior on activation & initial install

### Changed
- Config not found behavior options from `[none|ignore]` to `[loud|quiet|silent]`
- More contextualized & actionable `stylelintrc` error information
- Much better UX in general when passing errors/alerts to user
- Updated extension icon

## v1.0.4
`March 30, 2022`

### Changed
- Bump version only to push fix for in-app icon display

## v1.0.3
`March 30, 2022`

### Fixed
- Bug preventing custom fallback config from being used
- Properly abort & pass relevant config problems to user instead of erroring out too early

### Changed
- Updated README & added preview image
- Nicer extension icon image

## v1.0.2
`March 28, 2022`

### Fixed
- Hotfix to patch self-thrown error not being caught as intended

## v1.0.1
`March 28, 2022`

### Fixed
- Bug where `.stylelintrc*` files are seen as non-existent when unable to resolve external modules defined therein [#1](https://github.com/nlydv/nova-stylelint/issues/1)

### Changed
- Minor optimizations around fallbacks and internal discovery

## v1.0.0
`March 23, 2022`

### Added
- Everything

### Fixed
- Nothing

# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- bundle with webpack (vsix >3MB --> ~150KB)!

### Changed
- disable save button when there is no editor
- update font awesome to version 6

## [0.1.10] - 2022-05-25
### Changed
- removed some extraneous toolbar buttons
### Fixed
- fixed bug that prevents writing to the beginning of a file
- fixed spacing of custom buttons

## [0.1.9] - 2022-05-24
### Fixed
- fixed bug with path building and directory creation on windows

## [0.1.8] - 2022-05-23
### Fixed
- remove hardcoded unix-style paths

## [0.1.7] - 2022-05-23
### Fixed
- settings pickers and custom inputs change together
- mask htr token input

## [0.1.6] - 2022-05-22
### Changed
- convert extension to typescript
### Added
- use [vscode-webview-ui-toolkit](https://github.com/microsoft/vscode-webview-ui-toolkit) library
- unit test framework and ci job
### Fixed
- preserve drawing when app is restarted or panel is moved to the background

## [0.1.5] - 2022-05-21
### Changed
- integrate mathpix HTR support
- convert settings into a small overlay

## [0.1.4] - 2022-05-21
### Changed
- integrate myscript HTR support
- simplify custom buttons interface

## [0.1.3] - 2022-05-20
### Changed
- update UI to closer match vscode's theme

## [0.1.2] - 2022-05-20
### Added
- support for asciidoc and restructuredtext

## [0.1.1] - 2022-05-20
### Fixed
- set webview color based on vscode light/dark theme

## [0.1.0] - 2022-05-20
### Added
- save svg to external file
- toggle svg text preview element

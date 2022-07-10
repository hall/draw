# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.19] - 2022-07-09

### Fixed

- create relative paths on Windows
- retain drawing on canvas after save

## [0.1.18] - 2022-06-13

### Added

- support multiple workspace roots

## [0.1.17] - 2022-06-10

### Fixed

- default canvas colors

## [0.1.16] - 2022-06-10

### Changed

- use VSCode's chart color variables

### Added

- map eraser to middle click (which is a button on, at least, some styluses)
- persist canvas settings and selections

### Fixed

- don't cut off buttons when the page wraps
- re-init canvas on restore (this preserves, e.g., the undo/redo list)

## [0.1.15] - 2022-06-07

### Fixed

- reuse filename when editing an existing file

### Changed

- pull updated settings without a reload

## [0.1.14] - 2022-06-01

### Fixed

- mathpix image upload

### Added

- drag-n-drop hover effect

## [0.1.13] - 2022-05-31

### Fixed

- fix HTR and custom buttons click events

## [0.1.12] - 2022-05-31

### Changed

- run in the browser context

## [0.1.11] - 2022-05-31

### Added

- bundle with webpack (vsix >3MB --> ~500KB)!
- disable save button when there is no active editor

### Changed

- update font awesome to version 6
- remove uuid dependency, use node's crypto library

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

# Draw, for the VSCode family

[![Open VSX Version](https://img.shields.io/open-vsx/v/hall/draw)](https://open-vsx.org/extension/hall/draw)
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/hall.draw)](https://marketplace.visualstudio.com/items?itemName=hall.draw)

Draw an SVG image with a mouse or pen.

![screenshot](docs/images/screenshot.png)

> **NOTE**: This is an alpha project; please open an issue for any bugs, questions, or ideas!

## Usage

Open a file (in a supported format) and run `Draw: Edit current line` by either

 - right clicking on the line or
 - opening the command palette (`F1` or `Ctrl-Shft-P`) and type `svg`

The currently supported formats are

 - markdown
 - asciidoc
 - restructuredtext

## Config

The following settings are available (prefixed with `draw`).

| setting   | description                                                           | default |
| --------- | --------------------------------------------------------------------- | ------- |
| directory | if set, save files to this directory (relative to the workspace root) | `""`    |
| buttons   | add [custom buttons](#custom-buttons) to the toolbar                  | `[]`    |


## Custom Buttons

To add custom buttons to the toolbar, add an entry to the `draw.buttons` array in `settings.json`; for example,

```json
"draw.buttons": [
    {
        "icon": "beer",
        "title": "pour another",
        "function": "console.log('hooray!')"
    }
]
```

> search the [Font Awesome](https://fontawesome.com/v5/search?m=free) set for an icon name

## Handwritten Text Recognition

The following services are available to convert hand-written formulas to LaTeX equations.

### myscript

> free for 2000 requests/month

 - create [an account](https://developer.myscript.com/getting-started/web)
 - generate application and HMAC tokens
 - run `Draw: Configure HTR provider` and select `myscript`

### mathpix

> free for 1000 requests/month but charge a one-time, non-refundable, setup fee of $20

This integration also supports image drag and paste.

 - create [an account](https://mathpix.com/docs/ocr/overview)
 - create an org, pay the setup fee, and create an API key
 - run `Draw: Configure HTR provider` and select `mathpix`


## License

This project was forked from [zhaouv/vscode-markdown-draw](https://github.com/zhaouv/vscode-markdown-draw) and licensed under the [Apache-2.0 License](./LICENSE).

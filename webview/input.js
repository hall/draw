/*
 * Functions related to input devices (e.g., stylus, keybindings, etc)
 */

//
// pointer
//

// css does not allow variables in `url` so we use js instead
let cursorColor = getComputedStyle(document.body).getPropertyValue('--vscode-panel-border');
document.body.style.cursor = `url("data:image/svg+xml, <svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><circle cx='3' cy='3' r='3' fill='${cursorColor}'/></svg>") 1 1, crosshair`;

//
// keybindings
//

document.onkeydown = function (e) {
    switch (e.key) {

        case "z":
            if (e.ctrlKey) document.querySelector(`#svg-undo`).click();
            break;

        case "y":
            if (e.ctrlKey) document.querySelector(`#svg-redo`).click();
            break;

        case "F4":
            document.querySelector(`[data-type="pen"`).click();
            break;

        case "F6":
            document.querySelector(`[data-type="eraser"`).click();
            break;

        case "F7":
            document.querySelector(`[data-type="rect"`).click();
            break;

        case "F8":
            document.querySelector(`[data-type="circle"`).click();
            break;

        case "F9":
            document.querySelector(`[data-type="select"`).click();
            break;

        case "F10":
            document.querySelector(`#svg-clean`).click();
            break;
    }
}


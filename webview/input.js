/*
 * Functions related to input devices (e.g., stylus, keybindings, etc)
 */

//
// stylus
//

document.onpointerenter = (e) => {
    if (e.pointerType === "pen") document.body.style.cursor = "none";
};
document.onpointerdown = (e) => {
    if (e.pointerType === "pen") document.body.style.cursor = "none";
};
document.onpointerup = (e) => {
    if (e.pointerType !== "pen") document.body.style.cursor = "crosshair";
};
document.onpointermove = (e) => {
    document.body.style.cursor = e.pointerType === "mouse" ? "crosshair" : "none";
};

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


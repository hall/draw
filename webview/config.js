/*
 * Functions related to configuration
 */


/** default config values */
var config = {
    lineWidth: 2,
    color: "blue",
    fillColor: "none",
    fontSize: 14,

    eraserSize: 10,
    fontFamily: "inherit",
    type: "pen",
    show: false
};

/**
 * Map of color names to values.
 * 
 * See: https://code.visualstudio.com/api/references/theme-color#chart-colors
 */
var colors = {
    "blue": "--vscode-charts-blue",
    "red": "--vscode-charts-red",
    "yellow": "--vscode-charts-yellow",
    "orange": "--vscode-charts-orange",
    "green": "--vscode-charts-green",
    "purple": "--vscode-charts-purple",
    // "gray": "--vscode-charts-lines", // TODO: compensate for alpha channel
    "white": "--vscode-charts-foreground",
    "black": "#000000"
}

/**
 * Map of size names to values.
 */
var sizes = {
    "small": 2,
    "medium": 4,
    "large": 8,
};

/**
 * (Re-)construct settings values from config
 */
function initConfig() {
    document.querySelector(`[data-type="${config.type}"`).classList.add("active");

    /**
     * Bind select element of map entries to custom element for config property
     * 
     * @param {string} select query selector for select element
     * @param {string} map map of k/v pairs to populate select element
     * @param {string} custom query selector for custom element
     * @param {string} property property of config which custom element is bound
     */
    function bind(select, map, custom, property) {
        select = document.querySelector(select);
        custom = document.querySelector(custom);
        populate(select, map);

        custom.addEventListener("change", e => {
            config[property] = e.target.value;

            const name = Object.keys(map).find(key => cssResolve(map[key]) == e.target.value);
            selectOption(select, cssResolve(name in map && name !== "none" ? map[name] : "custom"));
        });

        select.addEventListener("input", e => {
            if (e.target.value == "none") {
                custom.style.opacity = 0.5;
                config[property] = "none";
            } else if (e.target.value != "custom") {
                custom.style.opacity = 1;
                custom.value = cssResolve(e.target.value);
                custom.dispatchEvent(new Event("change"));
            }
        });

        // create initial state
        let value = config[property];
        if (map === colors && !value.startsWith("#") && value !== "none") {
            value = cssResolve(map[value]);
        }

        if (value === "none") {
            selectOption(select, "none");
            select.dispatchEvent(new Event("change"));
        } else {
            custom.value = value;
            custom.dispatchEvent(new Event("change"));
        }
    }

    bind("#select-size", sizes, "#custom-size", "lineWidth");
    bind("#select-color", colors, "#custom-color", "color");
    bind("#select-fill", colors, "#custom-fill", "fillColor");

    let textSize = document.getElementById("text-size");
    textSize.addEventListener("input", e => {
        config.fontSize = e.target.value;
    });
    textSize.value = config.fontSize;

    if (config.show) document.getElementById("show-settings").click();
}

/**
 * Set the selected value of target element
 * 
 * @param {*} element input element
 * @param {string} value option value to select
 */
function selectOption(element, value) {
    if (element.children) {
        const elm = Array.from(element.children).find(option => option.value == value)
        if (elm.value === "custom") {
            // show "custom" option when it's selected as a placeholder
            elm.hidden = false;
        } else {
            // hide "custom" option so it's can't be selected
            Array.from(element.children).find(option => option.value == "custom").hidden = true;
        }
        elm.selected = true;
        // https://github.com/microsoft/vscode-webview-ui-toolkit/issues/332
        elm.setAttribute("selected", true);
    }
}

/**
 * populate a dropdown element with the presets from object
 */
function populate(element, object) {
    // remove all existing options so the function is idempotent
    element.replaceChildren();

    let option = document.createElement("vscode-option");
    option.value = "custom";
    option.innerHTML = option.text = "--";
    option.hidden = true;
    element.appendChild(option);

    Object.keys(object).forEach(name => {
        let option = document.createElement("vscode-option");
        option.value = object === colors ? cssResolve(object[name]) : object[name];
        option.innerHTML = option.text = name;
        element.appendChild(option);
    })

    // allow no color (i.e., transparent)
    if (element.id === "select-fill") {
        let option = document.createElement("vscode-option");
        option.value = option.innerHTML = option.text = "none";
        element.appendChild(option);
    }
}

/**
 * Resolve CSS variable if string starts with "--", otherwise, return string as-is
 * @param {string} value 
 */
function cssResolve(value) {
    if (typeof value === 'string' && value.startsWith("--")) {
        return window.getComputedStyle(document.documentElement).getPropertyValue(value);
    }
    return value;
}
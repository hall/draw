if (typeof exports === 'undefined') exports = {};
if (typeof require !== 'undefined') {
  var { intersect } = require('./path-int');
} else {
  var { intersect } = exports;
}

window.paints = [];

// convent a css color name to its hex value
function getHexColor(str) {
  var canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  ctx.fillStyle = str;
  let hex = ctx.fillStyle;
  canvas.remove();
  return hex
}

function rect2path(x, y, width, height, rx, ry) {
  x = parseFloat(x);
  y = parseFloat(y);
  width = parseFloat(width);
  height = parseFloat(height);
  rx = parseFloat(rx);
  ry = parseFloat(ry);
  rx = rx || ry || 0;
  ry = ry || rx || 0;
  if (isNaN(x - y + width - height + rx - ry)) return;
  rx = rx > width / 2 ? width / 2 : rx;
  ry = ry > height / 2 ? height / 2 : ry;
  var path = "";
  if (0 == rx || 0 == ry) {
    path = `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
  } else {
    path =
      `M ${x} ${y + ry} ` +
      `a ${rx} ${ry} 0 0 1 ${rx} ${-ry} ` +
      `h ${width - 2 * rx} ` +
      `a ${rx} ${ry} 0 0 1 ${rx} ${ry} ` +
      `v ${height - 2 * ry} ` +
      `a ${rx} ${ry} 0 0 1 ${-rx} ${ry} ` +
      `h ${2 * rx - width} ` +
      `a ${rx} ${ry} 0 0 1 ${-rx} ${-ry} ` +
      `Z`;
  }
  return path;
}

function ellipse2path(cx, cy, rx, ry) {
  cx = parseFloat(cx);
  cy = parseFloat(cy);
  rx = parseFloat(rx);
  ry = parseFloat(ry);
  if (isNaN(cx - cy + rx - ry)) return;
  return (
    `M ${cx - rx} ${cy} ` +
    `a ${rx} ${ry} 0 1 0 ${2 * rx} 0` +
    `a ${rx} ${ry} 0 1 0 ${-2 * rx} 0 ` +
    `Z`
  );
}

function polygon2path(points) {
  let pointsList = points.split(/(,|, )/g);
  return `M ${pointsList[0]} L ${pointsList.splice(1).join(" ")} Z`;
}

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
 * Resolve CSS variable if string starts with "--", otherwise, return string as-is
 * @param {string} value 
 */
function cssResolve(value) {
  if (typeof value === 'string' && value.startsWith("--")) {
    return window.getComputedStyle(document.documentElement).getPropertyValue(value);
  }
  return value;
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
 * (Re-)construct settings values from config
 */
function initConfig() {
  document.querySelector(`[data-type="${config.type}"`).classList.add("active");

  /**
   * Setup color selector/picker binding and events
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
      selectOption(select, cssResolve(name in map ? map[name] : "custom"));
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
    custom.value = config[property];
    custom.dispatchEvent(new Event("change"));
  }

  bind("#select-size", sizes, "#custom-size", "lineWidth");
  bind("#select-color", colors, "#custom-color", "color");
  bind("#select-fill", colors, "#custom-fill", "fillColor");


  let textSize = document.getElementById("text-size");
  textSize.addEventListener("input", e => {
    config.fontSize = e.target.value;
  });
  textSize.value = config.fontSize;


  if (config.show) {
    document.getElementById("show-settings").click();
  }
}

exports.initPaint = function (svgId) {
  if (window.paints[svgId]) {
    return;
  } else {
    window.paints.push(svgId);
  }
  var svgns = "http://www.w3.org/2000/svg";
  var svg = document.getElementById(svgId);
  // var svgOffset = svg.getBoundingClientRect();


  var drawMoveOpen = false;
  var selectHasMove = false;
  var resizeOpen = false;
  var svgCurrEle = null;
  var eraserPath = "";
  var tempPoint = null;
  var drawLimited = false;
  var resizeBtn = false;
  var resizeIndex = null;
  var resizeEle = null;
  let resizeType = null;
  var resizePoints = {};

  var undoList = [];
  var redoList = [];
  var boxSizeList = [];
  var redoBoxSizeList = [];

  // Init
  var reInit = () => {
    for (const item of svg.children) {
      undoList.push(item);
      boxSizeList.push(item.getBBox());
    }
    initConfig();
  };
  reInit();

  var getPoint = (x, y) => {
    var svgOffset = svg.getBoundingClientRect();
    if (drawLimited) {
      return {
        x: Math.round((x - svgOffset.x) / 20) * 20,
        y: Math.round((y - svgOffset.y) / 20) * 20
      };
    } else {
      return {
        x: Math.round((x - svgOffset.x) * 100) / 100,
        y: Math.round((y - svgOffset.y) * 100) / 100
      };
    }
  };

  var drawDown = e => {
    // TODO: also modify the display of the interface
    if (e.buttons === 32 || e.buttons == 4) {
      // 4 => middle click or stylus back (?) button
      config.type = "eraser";
    }
    if (
      e.pointerType === "pen" &&
      config.type === "eraser" &&
      e.buttons === 1
    ) {
      config.type = "pen";
    }
    drawMoveOpen = true;
    let { x, y } = getPoint(e.clientX, e.clientY);
    if (e.target.getAttributeNS(null, "data-resize")) {
      resizeOpen = true;
      resizeBtn = e.target;
      tempPoint = { x, y };
      resizeIndex = parseInt(
        resizeBtn.parentElement.getAttributeNS(null, "data-index")
      );
      resizeEle = undoList[resizeIndex];
      resizeType = resizeEle.nodeName;
      if (resizeType === "path") {
        resizePoints = {
          x: boxSizeList[resizeIndex].x,
          y: boxSizeList[resizeIndex].y,
          width: boxSizeList[resizeIndex].width,
          height: boxSizeList[resizeIndex].height,
          points: resizeEle
            .getAttributeNS(null, "d")
            .split(/M |L /g)
            .map(item => {
              return {
                x: parseFloat(item.split(",")[0]),
                y: parseFloat(item.split(",")[1])
              };
            })
        };
      }
      if (resizeType === "line") {
        resizePoints = {
          x1: parseFloat(resizeEle.getAttributeNS(null, "x1")),
          y1: parseFloat(resizeEle.getAttributeNS(null, "y1")),
          x2: parseFloat(resizeEle.getAttributeNS(null, "x2")),
          y2: parseFloat(resizeEle.getAttributeNS(null, "y2"))
        };
      }
      if (resizeType === "rect") {
        resizePoints = {
          x: parseFloat(resizeEle.getAttributeNS(null, "x")),
          y: parseFloat(resizeEle.getAttributeNS(null, "y")),
          width: parseFloat(resizeEle.getAttributeNS(null, "width")),
          height: parseFloat(resizeEle.getAttributeNS(null, "height"))
        };
      }
      if (resizeType === "circle" || resizeType === "ellipse") {
        resizePoints = {
          cx: parseFloat(resizeEle.getAttributeNS(null, "cx")),
          cy: parseFloat(resizeEle.getAttributeNS(null, "cy")),
          rx: parseFloat(
            resizeEle.getAttributeNS(null, resizeType === "circle" ? "r" : "rx")
          ),
          ry: parseFloat(
            resizeEle.getAttributeNS(null, resizeType === "circle" ? "r" : "ry")
          )
        };
      }
      if (resizeType === "polygon") {
        resizePoints = {
          x: boxSizeList[resizeIndex].x,
          y: boxSizeList[resizeIndex].y,
          width: boxSizeList[resizeIndex].width,
          height: boxSizeList[resizeIndex].height,
          points: resizeEle
            .getAttributeNS(null, "points")
            .split(", ")
            .map(item => {
              return {
                x: parseFloat(item.split(" ")[0]),
                y: parseFloat(item.split(" ")[1])
              };
            })
        };
      }
      return;
    } else if (svg.querySelector("#selects")) {
      svg.querySelector("#selects").remove();
    }

    redoList = [];
    if (config.type === "pen") {
      svgCurrEle = document.createElementNS(svgns, "path");
      svgCurrEle.setAttributeNS(null, "d", `M ${x},${y}`);
    }
    if (config.type === "line") {
      svgCurrEle = document.createElementNS(svgns, "line");
      svgCurrEle.setAttributeNS(null, "x1", x);
      svgCurrEle.setAttributeNS(null, "y1", y);
      svgCurrEle.setAttributeNS(null, "x2", x);
      svgCurrEle.setAttributeNS(null, "y2", y);
      tempPoint = { x, y };
    }
    if (config.type === "rect" || config.type === "round-rect") {
      svgCurrEle = document.createElementNS(svgns, "rect");
      svgCurrEle.setAttributeNS(null, "x", x);
      svgCurrEle.setAttributeNS(null, "y", y);
      tempPoint = { x, y };
    }
    if (config.type === "circle") {
      svgCurrEle = document.createElementNS(svgns, "circle");
      svgCurrEle.setAttributeNS(null, "cx", x);
      svgCurrEle.setAttributeNS(null, "cy", y);
      tempPoint = { x, y };
    }
    if (config.type === "ellipse") {
      svgCurrEle = document.createElementNS(svgns, "ellipse");
      svgCurrEle.setAttributeNS(null, "cx", x);
      svgCurrEle.setAttributeNS(null, "cy", y);
      tempPoint = { x, y };
    }
    if (config.type === "polygon") {
      if (tempPoint === null) {
        svgCurrEle = document.createElementNS(svgns, "polygon");
        svgCurrEle.setAttributeNS(null, "points", `${x} ${y}`);
        tempPoint = `${x} ${y}, `;
      } else {
        tempPoint += `${x} ${y}, `;
      }
    }
    if (config.type === "rhombus") {
      svgCurrEle = document.createElementNS(svgns, "polygon");
      svgCurrEle.setAttributeNS(null, "points", `${x} ${y}`);
      tempPoint = { x, y };
    }
    if (config.type === "eraser") {
      eraserPath = `M ${x} ${y}`;
    } else if (config.type === "text") {
      drawMoveOpen = false;
      svgCurrEle = document.createElementNS(svgns, "text");
      svgCurrEle.setAttributeNS(null, "font-family", config.fontFamily);
      svgCurrEle.setAttributeNS(null, "font-size", config.fontSize);
      svgCurrEle.setAttributeNS(null, "fill", config.color);
      svgCurrEle.setAttributeNS(null, "x", x);
      svgCurrEle.setAttributeNS(null, "y", y);
      let input = document.createElement("input");
      input.style.fontFamily = config.fontFamily;
      input.style.fontSize = config.fontSize + "px";
      input.style.color = config.color;
      input.type = "text";
      input.style.position = "fixed";
      input.style.top = e.clientY - config.fontSize + "px";
      input.style.left = e.clientX + "px";
      document.body.append(input);
      setTimeout(() => input.focus(), 0);
      input.addEventListener("blur", e => {
        input.remove();
      });
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          svgCurrEle.textContent = input.value;
          svg.append(svgCurrEle);
          input.remove();
        }
      });
    } else if (config.type === "select") {
      svgCurrEle = document.createElementNS(svgns, "rect");
      svgCurrEle.setAttributeNS(null, "x", x);
      svgCurrEle.setAttributeNS(null, "y", y);
      svgCurrEle.setAttributeNS(null, "fill", "rgba(240, 240,240, 0.4)");
      svgCurrEle.setAttributeNS(null, "stroke", "#BBB");
      svgCurrEle.setAttributeNS(null, "stroke-width", 1);
      svg.append(svgCurrEle);
      tempPoint = { x, y };
      selectHasMove = false;
    } else {
      if (config.type !== "pen" && config.type !== "line") {
        svgCurrEle.setAttributeNS(null, "fill", config.fillColor);
      } else {
        svgCurrEle.setAttributeNS(null, "fill", "none");
      }
      svgCurrEle.setAttributeNS(null, "stroke", config.color);
      svgCurrEle.setAttributeNS(null, "stroke-width", config.lineWidth);
      svg.append(svgCurrEle);
    }
  };

  var drawMove = e => {
    if (!drawMoveOpen) {
      return;
    }
    let { x, y } = getPoint(e.clientX, e.clientY);
    if (resizeOpen) {
      let selectBox = resizeBtn.parentElement;
      switch (resizeBtn.getAttributeNS(null, "data-resize")) {
        case "mv":
          if (resizeType === "line") {
            resizeEle.setAttributeNS(
              null,
              "x1",
              resizePoints.x1 + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "x2",
              resizePoints.x2 + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "y1",
              resizePoints.y1 + y - tempPoint.y
            );
            resizeEle.setAttributeNS(
              null,
              "y2",
              resizePoints.y2 + y - tempPoint.y
            );
          }
          if (resizeType === "rect") {
            resizeEle.setAttributeNS(
              null,
              "x",
              resizePoints.x + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "y",
              resizePoints.y + y - tempPoint.y
            );
          }
          if (resizeType === "circle" || resizeType === "ellipse") {
            resizeEle.setAttributeNS(
              null,
              "cx",
              resizePoints.cx + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "cy",
              resizePoints.cy + y - tempPoint.y
            );
          }
          if (resizeType === "polygon") {
            let points = resizePoints.points
              .map(
                item =>
                  `${item.x + x - tempPoint.x} ${item.y + y - tempPoint.y}`
              )
              .join(", ");
            resizeEle.setAttributeNS(null, "points", points);
          }
          if (resizeType === "path") {
            let points = resizePoints.points
              .map(item => {
                if (isNaN(item.x) || isNaN(item.y)) {
                  return "";
                } else {
                  return `${item.x + x - tempPoint.x},${item.y +
                    y -
                    tempPoint.y}`;
                }
              })
              .join(" L ");
            resizeEle.setAttributeNS(null, "d", `M${points.substring(2)}`);
          }
          break;
        case "tl":
          if (resizeType === "line") {
            resizeEle.setAttributeNS(
              null,
              "x1",
              resizePoints.x1 + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "y1",
              resizePoints.y1 + y - tempPoint.y
            );
          }
          if (resizeType === "rect") {
            resizeEle.setAttributeNS(
              null,
              "x",
              resizePoints.x + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "y",
              resizePoints.y + y - tempPoint.y
            );
            resizeEle.setAttributeNS(
              null,
              "width",
              resizePoints.width - x + tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "height",
              resizePoints.height - y + tempPoint.y
            );
          }
          if (resizeType === "circle") {
            let len = Math.min((x - tempPoint.x) / 2, (y - tempPoint.y) / 2);
            resizeEle.setAttributeNS(null, "cx", resizePoints.cx + len);
            resizeEle.setAttributeNS(null, "cy", resizePoints.cy + len);
            resizeEle.setAttributeNS(null, "r", resizePoints.rx - len);
          }
          if (resizeType === "ellipse") {
            resizeEle.setAttributeNS(
              null,
              "cx",
              resizePoints.cx + (x - tempPoint.x) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "cy",
              resizePoints.cy + (y - tempPoint.y) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "rx",
              resizePoints.rx - (x - tempPoint.x) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "ry",
              resizePoints.ry - (y - tempPoint.y) / 2
            );
          }
          if (resizeType === "polygon") {
            let s = {
              x: 1 - (x - tempPoint.x) / resizePoints.width,
              y: 1 - (y - tempPoint.y) / resizePoints.height
            };
            let points = resizePoints.points
              .map(
                item =>
                  `${(item.x - resizePoints.x) * s.x +
                  resizePoints.x +
                  x -
                  tempPoint.x} ${(item.y - resizePoints.y) * s.y +
                  resizePoints.y +
                  y -
                  tempPoint.y}`
              )
              .join(", ");
            resizeEle.setAttributeNS(null, "points", points);
          }
          if (resizeType === "path") {
            let s = {
              x: 1 - (x - tempPoint.x) / resizePoints.width,
              y: 1 - (y - tempPoint.y) / resizePoints.height
            };
            let points = resizePoints.points
              .map(item => {
                if (isNaN(item.x) || isNaN(item.y)) {
                  return "";
                } else {
                  return `${(item.x - resizePoints.x) * s.x +
                    resizePoints.x +
                    x -
                    tempPoint.x},${(item.y - resizePoints.y) * s.y +
                    resizePoints.y +
                    y -
                    tempPoint.y}`;
                }
              })
              .join(" L ");
            resizeEle.setAttributeNS(null, "d", `M${points.substring(2)}`);
          }
          break;
        case "bl":
          if (resizeType === "line") {
            resizeEle.setAttributeNS(
              null,
              "x1",
              resizePoints.x1 + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "y2",
              resizePoints.y2 + y - tempPoint.y
            );
          }
          if (resizeType === "rect") {
            resizeEle.setAttributeNS(
              null,
              "x",
              resizePoints.x + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "width",
              resizePoints.width - x + tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "height",
              resizePoints.height + y - tempPoint.y
            );
          }
          if (resizeType === "circle") {
            let len = Math.min((x - tempPoint.x) / 2, -(y - tempPoint.y) / 2);
            resizeEle.setAttributeNS(null, "cx", resizePoints.cx + len);
            resizeEle.setAttributeNS(null, "cy", resizePoints.cy - len);
            resizeEle.setAttributeNS(null, "r", resizePoints.rx - len);
          }
          if (resizeType === "ellipse") {
            resizeEle.setAttributeNS(
              null,
              "cx",
              resizePoints.cx + (x - tempPoint.x) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "cy",
              resizePoints.cy + (y - tempPoint.y) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "rx",
              resizePoints.rx - (x - tempPoint.x) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "ry",
              resizePoints.ry + (y - tempPoint.y) / 2
            );
          }
          if (resizeType === "polygon") {
            let s = {
              x: 1 - (x - tempPoint.x) / resizePoints.width,
              y: 1 + (y - tempPoint.y) / resizePoints.height
            };
            let points = resizePoints.points
              .map(
                item =>
                  `${(item.x - resizePoints.x) * s.x +
                  resizePoints.x +
                  x -
                  tempPoint.x} ${(item.y - resizePoints.y) * s.y +
                  resizePoints.y}`
              )
              .join(", ");
            resizeEle.setAttributeNS(null, "points", points);
          }
          if (resizeType === "path") {
            let s = {
              x: 1 - (x - tempPoint.x) / resizePoints.width,
              y: 1 + (y - tempPoint.y) / resizePoints.height
            };
            let points = resizePoints.points
              .map(item => {
                if (isNaN(item.x) || isNaN(item.y)) {
                  return "";
                } else {
                  return `${(item.x - resizePoints.x) * s.x +
                    resizePoints.x +
                    x -
                    tempPoint.x},${(item.y - resizePoints.y) * s.y +
                    resizePoints.y}`;
                }
              })
              .join(" L ");
            resizeEle.setAttributeNS(null, "d", `M${points.substring(2)}`);
          }
          break;
        case "tr":
          if (resizeType === "line") {
            resizeEle.setAttributeNS(
              null,
              "x2",
              resizePoints.x2 + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "y1",
              resizePoints.y1 + y - tempPoint.y
            );
          }
          if (resizeType === "rect") {
            resizeEle.setAttributeNS(
              null,
              "y",
              resizePoints.y + y - tempPoint.y
            );
            resizeEle.setAttributeNS(
              null,
              "width",
              resizePoints.width + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "height",
              resizePoints.height - y + tempPoint.y
            );
          }
          if (resizeType === "circle") {
            let len = Math.min((x - tempPoint.x) / 2, -(y - tempPoint.y) / 2);
            resizeEle.setAttributeNS(null, "cx", resizePoints.cx + len);
            resizeEle.setAttributeNS(null, "cy", resizePoints.cy - len);
            resizeEle.setAttributeNS(null, "r", resizePoints.rx + len);
          }
          if (resizeType === "ellipse") {
            resizeEle.setAttributeNS(
              null,
              "cx",
              resizePoints.cx + (x - tempPoint.x) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "cy",
              resizePoints.cy + (y - tempPoint.y) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "rx",
              resizePoints.rx + (x - tempPoint.x) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "ry",
              resizePoints.ry - (y - tempPoint.y) / 2
            );
          }
          if (resizeType === "polygon") {
            let s = {
              x: 1 + (x - tempPoint.x) / resizePoints.width,
              y: 1 - (y - tempPoint.y) / resizePoints.height
            };
            let points = resizePoints.points
              .map(
                item =>
                  `${(item.x - resizePoints.x) * s.x +
                  resizePoints.x} ${(item.y - resizePoints.y) * s.y +
                  resizePoints.y +
                  y -
                  tempPoint.y}`
              )
              .join(", ");
            resizeEle.setAttributeNS(null, "points", points);
          }
          if (resizeType === "path") {
            let s = {
              x: 1 + (x - tempPoint.x) / resizePoints.width,
              y: 1 - (y - tempPoint.y) / resizePoints.height
            };
            let points = resizePoints.points
              .map(item => {
                if (isNaN(item.x) || isNaN(item.y)) {
                  return "";
                } else {
                  return `${(item.x - resizePoints.x) * s.x +
                    resizePoints.x},${(item.y - resizePoints.y) * s.y +
                    resizePoints.y +
                    y -
                    tempPoint.y}`;
                }
              })
              .join(" L ");
            resizeEle.setAttributeNS(null, "d", `M${points.substring(2)}`);
          }
          break;
        case "br":
          if (resizeType === "line") {
            resizeEle.setAttributeNS(
              null,
              "x2",
              resizePoints.x2 + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "y2",
              resizePoints.y2 + y - tempPoint.y
            );
          }
          if (resizeType === "rect") {
            resizeEle.setAttributeNS(
              null,
              "width",
              resizePoints.width + x - tempPoint.x
            );
            resizeEle.setAttributeNS(
              null,
              "height",
              resizePoints.height + y - tempPoint.y
            );
          }
          if (resizeType === "circle") {
            let len = Math.min((x - tempPoint.x) / 2, (y - tempPoint.y) / 2);
            resizeEle.setAttributeNS(null, "cx", resizePoints.cx + len);
            resizeEle.setAttributeNS(null, "cy", resizePoints.cy + len);
            resizeEle.setAttributeNS(null, "r", resizePoints.rx + len);
          }
          if (resizeType === "ellipse") {
            resizeEle.setAttributeNS(
              null,
              "cx",
              resizePoints.cx + (x - tempPoint.x) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "cy",
              resizePoints.cy + (y - tempPoint.y) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "rx",
              resizePoints.rx + (x - tempPoint.x) / 2
            );
            resizeEle.setAttributeNS(
              null,
              "ry",
              resizePoints.ry + (y - tempPoint.y) / 2
            );
          }
          if (resizeType === "polygon") {
            let s = {
              x: 1 + (x - tempPoint.x) / resizePoints.width,
              y: 1 + (y - tempPoint.y) / resizePoints.height
            };
            let points = resizePoints.points
              .map(
                item =>
                  `${(item.x - resizePoints.x) * s.x +
                  resizePoints.x} ${(item.y - resizePoints.y) * s.y +
                  resizePoints.y}`
              )
              .join(", ");
            resizeEle.setAttributeNS(null, "points", points);
          }
          if (resizeType === "path") {
            let s = {
              x: 1 + (x - tempPoint.x) / resizePoints.width,
              y: 1 + (y - tempPoint.y) / resizePoints.height
            };
            let points = resizePoints.points
              .map(item => {
                if (isNaN(item.x) || isNaN(item.y)) {
                  return "";
                } else {
                  return `${(item.x - resizePoints.x) * s.x +
                    resizePoints.x},${(item.y - resizePoints.y) * s.y +
                    resizePoints.y}`;
                }
              })
              .join(" L ");
            resizeEle.setAttributeNS(null, "d", `M${points.substring(2)}`);
          }
          break;
      }
      let boxSize = resizeEle.getBBox();
      boxSizeList[resizeIndex] = boxSize;
      selectBox.children[0].setAttributeNS(null, "x", boxSize.x - 5);
      selectBox.children[0].setAttributeNS(null, "y", boxSize.y - 5);
      selectBox.children[0].setAttributeNS(null, "width", boxSize.width + 10);
      selectBox.children[0].setAttributeNS(null, "height", boxSize.height + 10);
      selectBox.children[1].setAttributeNS(null, "x", boxSize.x - 8);
      selectBox.children[1].setAttributeNS(null, "y", boxSize.y - 8);
      selectBox.children[2].setAttributeNS(
        null,
        "x",
        boxSize.x + boxSize.width
      );
      selectBox.children[2].setAttributeNS(null, "y", boxSize.y - 8);
      selectBox.children[3].setAttributeNS(
        null,
        "x",
        boxSize.x + boxSize.width
      );
      selectBox.children[3].setAttributeNS(
        null,
        "y",
        boxSize.y + boxSize.height
      );
      selectBox.children[4].setAttributeNS(null, "x", boxSize.x - 8);
      selectBox.children[4].setAttributeNS(
        null,
        "y",
        boxSize.y + boxSize.height
      );
      return;
    }
    if (config.type === "pen") {
      svgCurrEle.setAttributeNS(
        null,
        "d",
        `${svgCurrEle.getAttributeNS(null, "d")} L ${x},${y}`
      );
    }
    if (config.type === "eraser") {
      eraserPath += `L ${x} ${y}`;
      let index = undoList.findIndex(
        item => intersect(eraserPath, item.getAttributeNS(null, "d")).length > 0
      );
      if (index !== -1) {
        undoList[index].remove();
        undoList.splice(index, 1);
        boxSizeList.splice(index, 1);
      }
    }
    if (config.type === "line") {
      svgCurrEle.setAttributeNS(null, "x2", x);
      svgCurrEle.setAttributeNS(null, "y2", y);
    }
    if (config.type === "rect" || config.type === "round-rect") {
      if (x - tempPoint.x < 0) {
        svgCurrEle.setAttributeNS(null, "x", x);
        svgCurrEle.setAttributeNS(null, "y", y);
      }
      svgCurrEle.setAttributeNS(null, "width", Math.abs(x - tempPoint.x));
      svgCurrEle.setAttributeNS(null, "height", Math.abs(y - tempPoint.y));
      if (config.type === "round-rect") {
        svgCurrEle.setAttributeNS(null, "rx", 10);
        svgCurrEle.setAttributeNS(null, "ry", 10);
      }
    }
    if (config.type === "circle") {
      svgCurrEle.setAttributeNS(
        null,
        "r",
        Math.sqrt(Math.pow(x - tempPoint.x, 2) + Math.pow(y - tempPoint.y, 2))
      );
    }
    if (config.type === "ellipse") {
      svgCurrEle.setAttributeNS(null, "rx", Math.abs(x - tempPoint.x));
      svgCurrEle.setAttributeNS(null, "ry", Math.abs(y - tempPoint.y));
    }
    if (config.type === "polygon") {
      svgCurrEle.setAttributeNS(null, "points", tempPoint + `${x} ${y}`);
    }
    if (config.type === "rhombus") {
      let x2 = (x + tempPoint.x) / 2;
      let y2 = (y + tempPoint.y) / 2;
      svgCurrEle.setAttributeNS(
        null,
        "points",
        `${x} ${y2}, ${x2} ${y}, ${tempPoint.x} ${y2}, ${x2} ${tempPoint.y}`
      );
    }
    if (config.type === "select") {
      if (x - tempPoint.x < 0) {
        svgCurrEle.setAttributeNS(null, "x", x);
        svgCurrEle.setAttributeNS(null, "y", y);
      }
      svgCurrEle.setAttributeNS(null, "width", Math.abs(x - tempPoint.x));
      svgCurrEle.setAttributeNS(null, "height", Math.abs(y - tempPoint.y));
      selectHasMove = true;
    }
  };

  var drawUp = e => {
    let { x, y } = getPoint(e.clientX, e.clientY);
    drawMoveOpen = false;
    if (config.type === "eraser") {
      return;
    }
    if (resizeOpen) {
      resizeOpen = false;
      return;
    }
    if (config.type === "line") {
      svgCurrEle.setAttributeNS(
        null,
        "d",
        `M ${svgCurrEle.getAttributeNS(null, "x1")} ${svgCurrEle.getAttributeNS(
          null,
          "y1"
        )} L ${svgCurrEle.getAttributeNS(
          null,
          "x2"
        )} ${svgCurrEle.getAttributeNS(null, "y2")}`
      );
    }
    if (config.type === "rect" || config.type === "round-rect") {
      svgCurrEle.setAttributeNS(
        null,
        "d",
        rect2path(
          svgCurrEle.getAttributeNS(null, "x"),
          svgCurrEle.getAttributeNS(null, "y"),
          svgCurrEle.getAttributeNS(null, "width"),
          svgCurrEle.getAttributeNS(null, "height"),
          svgCurrEle.getAttributeNS(null, "rx"),
          svgCurrEle.getAttributeNS(null, "ry")
        )
      );
    }
    if (config.type === "circle") {
      svgCurrEle.setAttributeNS(
        null,
        "d",
        ellipse2path(
          svgCurrEle.getAttributeNS(null, "cx"),
          svgCurrEle.getAttributeNS(null, "cy"),
          svgCurrEle.getAttributeNS(null, "r"),
          svgCurrEle.getAttributeNS(null, "r")
        )
      );
    }
    if (config.type === "ellipse") {
      svgCurrEle.setAttributeNS(
        null,
        "d",
        ellipse2path(
          svgCurrEle.getAttributeNS(null, "cx"),
          svgCurrEle.getAttributeNS(null, "cy"),
          svgCurrEle.getAttributeNS(null, "rx"),
          svgCurrEle.getAttributeNS(null, "ry")
        )
      );
    }
    if (config.type === "polygon") {
      drawMoveOpen = true;
      return;
    }
    if (config.type === "rhombus") {
      svgCurrEle.setAttributeNS(
        null,
        "d",
        polygon2path(svgCurrEle.getAttributeNS(null, "points"))
      );
    }
    if (config.type === "select") {
      if (!selectHasMove) {
        svg.querySelector("#selects").remove();
        return;
      }
      svgCurrEle.remove();
      let selects = document.createElementNS(svgns, "g");
      selects.id = "selects";
      svg.append(selects);
      for (let i = 0; i < boxSizeList.length; i++) {
        if (
          boxSizeList[i].x >= tempPoint.x &&
          boxSizeList[i].y >= tempPoint.y &&
          boxSizeList[i].x + boxSizeList[i].width <= x &&
          boxSizeList[i].y + boxSizeList[i].height <= y
        ) {
          let selectBoxC = document.createElementNS(svgns, "g");
          selectBoxC.setAttributeNS(null, "data-index", i);
          selects.append(selectBoxC);
          let selectBox = document.createElementNS(svgns, "rect");
          selectBox.setAttributeNS(null, "x", boxSizeList[i].x - 5);
          selectBox.setAttributeNS(null, "y", boxSizeList[i].y - 5);
          selectBox.setAttributeNS(null, "width", boxSizeList[i].width + 10);
          selectBox.setAttributeNS(null, "height", boxSizeList[i].height + 10);
          selectBox.setAttributeNS(null, "fill", "transparent");
          selectBox.setAttributeNS(null, "stroke", "#888");
          selectBox.setAttributeNS(null, "stroke-width", 1);
          selectBox.setAttributeNS(null, "stroke-dasharray", "3 3");
          selectBox.setAttributeNS(null, "data-resize", "mv");
          selectBox.style.cursor = "move";
          selectBoxC.append(selectBox);
          let addSelectBoxBtn = (x, y, type) => {
            let selectBoxBtn = document.createElementNS(
              svgns,
              type === "ro" ? "circle" : "rect"
            );
            if (type === "ro") {
              selectBoxBtn.setAttributeNS(null, "cx", x);
              selectBoxBtn.setAttributeNS(null, "cy", y);
              selectBoxBtn.setAttributeNS(null, "r", 4);
            } else {
              selectBoxBtn.setAttributeNS(null, "x", x);
              selectBoxBtn.setAttributeNS(null, "y", y);
              selectBoxBtn.setAttributeNS(null, "width", 8);
              selectBoxBtn.setAttributeNS(null, "height", 8);
            }
            selectBoxBtn.setAttributeNS(null, "fill", "#FFF");
            selectBoxBtn.setAttributeNS(null, "stroke", "#888");
            selectBoxBtn.setAttributeNS(null, "stroke-width", 1);
            selectBoxBtn.setAttributeNS(null, "data-resize", type);
            selectBoxBtn.style.cursor =
              type === "ro"
                ? "alias"
                : type === "tl" || type === "br"
                  ? "nwse-resize"
                  : "nesw-resize";
            selectBoxC.append(selectBoxBtn);
          };
          addSelectBoxBtn(boxSizeList[i].x - 8, boxSizeList[i].y - 8, "tl");
          addSelectBoxBtn(
            boxSizeList[i].x + boxSizeList[i].width,
            boxSizeList[i].y - 8,
            "tr"
          );
          addSelectBoxBtn(
            boxSizeList[i].x + boxSizeList[i].width,
            boxSizeList[i].y + boxSizeList[i].height,
            "br"
          );
          addSelectBoxBtn(
            boxSizeList[i].x - 8,
            boxSizeList[i].y + boxSizeList[i].height,
            "bl"
          );
        }
      }
    } else {
      undoList.push(svgCurrEle);
      boxSizeList.push(svgCurrEle.getBBox());
    }
  };

  svg.addEventListener("pointerdown", drawDown);
  svg.addEventListener("pointermove", drawMove);
  svg.addEventListener("pointerup", drawUp);

  var stopPolygon = () => {
    tempPoint = null;
    drawMoveOpen = false;
    svgCurrEle.setAttributeNS(
      null,
      "d",
      polygon2path(svgCurrEle.getAttributeNS(null, "points"))
    );
    undoList.push(svgCurrEle);
    boxSizeList.push(svgCurrEle.getBBox());
  };

  window.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      stopPolygon();
    }
    if (e.key === "Control") {
      drawLimited = true;
    }
    if (e.key === "Delete" && svg.querySelector("#selects")) {
      redoList = [];
      for (const item of svg.querySelector("#selects").children) {
        let index = item.getAttributeNS(null, "data-index");
        undoList[index].remove();
        redoList.push(undoList[index]);
        undoList.slice(index, 1);
        boxSizeList.splice(index, 1);
      }
      svg.querySelector("#selects").remove();
    }
  });

  window.addEventListener("keyup", e => {
    if (e.key === "Control") {
      drawLimited = false;
    }
  });

  document.querySelectorAll(".svg-pen vscode-button").forEach(item => {
    click(item, e => {
      document.querySelector("#svg-buttons .active")?.classList.remove("active");
      item.classList.add("active");
      config.type = item.getAttribute("data-type");
    });
  });

  document.querySelectorAll(".svg-shape vscode-button").forEach(item => {
    click(item, (e) => {
      document.querySelector("#svg-buttons .active")?.classList.remove("active");
      item.classList.add("active");
      config.type = item.getAttribute("data-type");
    });
  });

  click("#svg-undo", (e) => {
    if (undoList.length < 1) return;
    let undoEle = undoList.pop();
    undoEle.remove();
    redoList.push(undoEle);
    redoBoxSizeList.push(boxSizeList.pop());
  });

  click("#svg-redo", (e) => {
    if (redoList.length < 1) return;
    let redoEle = redoList.pop();
    svg.append(redoEle);
    undoList.push(redoEle);
    boxSizeList.push(redoBoxSizeList.pop());
  });

  click("#svg-clean", (e) => {
    undoList = [];
    redoList = [];
    boxSizeList = [];
    redoBoxSizeList = [];
    svg.innerHTML = "";
  });

  toggle("#show-settings", "#settings");

  click("#svg-save", e => {
    let textarea = document.createElement("textarea");
    let { x, y, width, height } = svg.getBBox();
    textarea.value = svg.outerHTML.replace('<svg id="svg">',
      `<svg id="svg" xmlns="${svgns}" viewBox="${x - 10} ${y - 10} ${width + 20} ${height + 20}" height="${height + 20}">`);
    window?.drawAPI.unstable.editCurrentLine({
      control: 0,
      text: textarea.value
    });
  });


  document.onkeydown = function (e) {
    var evtobj = window.event ? event : e

    // undo (Ctrl + Z)
    if (evtobj.keyCode == 90 && evtobj.ctrlKey) {
      if (undoList.length < 1) return;

      let undoEle = undoList.pop();
      undoEle.remove();
      redoList.push(undoEle);
      redoBoxSizeList.push(boxSizeList.pop());
    }

    // redo (Ctrl + Y)
    if (evtobj.keyCode == 89 && evtobj.ctrlKey) {
      if (redoList.length < 1) return;

      let redoEle = redoList.pop();
      svg.append(redoEle);
      undoList.push(redoEle);
      boxSizeList.push(redoBoxSizeList.pop());
    }

    //F4
    if (evtobj.keyCode == 115) {
      config.type = "pen";
      e.pointerType = "pen";
    }

    //F6
    if (evtobj.keyCode == 117) {
      config.type = "eraser";
      e.pointerType = "eraser";
    }

    //F7
    if (evtobj.keyCode == 118) {
      config.type = "rect";
      e.pointerType = "rect";
    }

    //F8
    if (evtobj.keyCode == 119) {
      config.type = "circle";
      e.pointerType = "circle";
    }

    //F9
    if (evtobj.keyCode == 120) {
      config.type = "select";
      e.pointerType = "select";
    }

    //F10
    if (evtobj.keyCode == 121) {
      undoList = [];
      redoList = [];
      boxSizeList = [];
      redoBoxSizeList = [];
      svg.innerHTML = "";
    }
  }

  return { reInit };
}

// wrap icon in div to allow binding an onclick events
function click(selector, callback) {
  let elm = selector;
  if (typeof (selector) == "string") {
    elm = document.querySelector(selector);
  }
  elm.addEventListener("click", e => callback(e));
}

// toggle visibility of target when button is clicked
function toggle(buttonSel, targetSel) {
  button = document.querySelector(buttonSel);
  target = document.querySelector(targetSel);
  click(buttonSel, () => {
    if (target.style.display === 'none') {
      target.style.display = '';
      button.classList.add("active");
      config.show = true;
    } else {
      target.style.display = 'none';
      button.classList.remove("active");
      config.show = false;
    }
  });

}


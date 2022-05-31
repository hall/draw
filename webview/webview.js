/* eslint-disable no-undef */

if (typeof require !== 'undefined') {
  var { initPaint } = require('./main');
} else {
  var { initPaint } = exports;
}

const exposedFunctions = initPaint("svg");

const svgElement = document.getElementById('svg');

const drawAPI = {
  unstable: {
    /**
     * 
     * @param {String} text text
     * @param {Number} control moving number of the cursor
     */
    getSVGElement: () => svgElement,
    /**
     * 
     * @param {(dataURL:String)=>undefined} cb callback
     */
    getPNG(cb) {
      var svg = drawAPI.unstable.getSVGElement();
      var { x, y, width, height } = svg.getBBox();
      var b = 10;
      var b2 = 2 * b;
      var wb = width + x + b;
      var hb = height + x + b;
      var w = width + b2;
      var h = height + b2;
      var data = svg.outerHTML.replace('<svg id="svg">',
        `<svg id="svgpng" viewbox="${x - b},${y - b},${w},${h}" style="height:${h}" xmlns="http://www.w3.org/2000/svg">`);
      var r = window.devicePixelRatio || 1;
      var setsize = (ele, ww, hh) => {
        ele.style.width = ww + 'px';
        ele.style.height = hh + 'px';
        ele.setAttribute('width', ww * r);
        ele.setAttribute('height', hh * r);
      };
      var can = document.createElement('canvas');
      setsize(can, w, h);
      var ctx = can.getContext('2d');
      var can2 = document.createElement('canvas');
      setsize(can2, wb, hb);
      var ctx2 = can2.getContext('2d');
      ctx2.scale(r, r);
      var img = new Image();
      setsize(img, wb, hb);
      img.onload = function () {
        ctx2.drawImage(img, 0, 0);
        ctx.putImageData(ctx2.getImageData((x - b) * r, (y - b) * r, w * r, h * r), 0, 0);
        cb(can.toDataURL());
        // document.body.append(can)
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(data);
    },
    reRegisterSVG() {
      exposedFunctions.reInit();
    },
    setSVGContent(content) {
      //potentially problematic replacement
      svgElement.innerHTML = content
        .replace(/<svg id="svg"[^>]*>/, '')
        .replace(/<\/svg>/, '');
      drawAPI.unstable.reRegisterSVG();
    },
    setContent(content) {
      document.querySelector("#svg-clean")?.click();
      // inaccurate check, write this first
      if (content.startsWith('<svg id="svg"')) {
        drawAPI.unstable.setSVGContent(content);
      }
    },
    custom(content) {
      content.forEach((c) => {
        if (c.type === undefined || c.type === 'script') {
          let icon = document.createElement("i");
          icon.classList.add("fa-solid", `fa-${c.icon}`);
          icon.title = c.title;
          let button = document.createElement("vscode-button");
          button.setAttribute("appearance", "icon");
          button.setAttribute("aria-label", c.title);
          button.appendChild(icon);
          button.onclick = new Function(c.function);

          let custom = document.querySelector('#custom-buttons')
          custom.innerHTML += "\n"; // for some reason, the spacing is off w/o this newline
          custom.appendChild(button)
        }
      });
    },
  },
};
window.drawAPI = drawAPI;

// Handle the message inside the webview
window.addEventListener('message', event => {

  const message = event.data // The JSON data our extension sent
    || event.detail; // for debug in chrome

  switch (message.command) {
    case 'currentLine':
      drawAPI.unstable.setContent(message.content);
      break;
    case 'customButtons':
      drawAPI.unstable.custom(message.content);
      break;
    case 'recognize':
      window[message.provider](message.token);
      break;
    case 'setState':
      switch (message.state) {
        case 'enabled':
          document.querySelector("#svg-save").parentElement.disabled = false;
          break;
        case 'disabled':
          document.querySelector("#svg-save").parentElement.disabled = true;
          break;

      }
      break;
  }
});


(function () {
  if (typeof acquireVsCodeApi !== 'undefined') {
    const vscode = acquireVsCodeApi();
    drawAPI.unstable.editCurrentLine = ({ text, control }) => {
      vscode.postMessage({
        text,
        control,
        command: 'editCurrentLine',
      });
    };
    // TODO: add loading spinner or something
    drawAPI.unstable.recognize = (provider) => {
      vscode.postMessage({
        command: 'recognize',
        provider: provider
      });
    };
    vscode.postMessage({ command: 'requestCustom' });

    const state = vscode.getState();
    if (state && "svg" in state) {
      // use saved state, if any
      svgElement.innerHTML = state["svg"];
    } else {
      // or start with drawing under selection
      vscode.postMessage({ command: 'requestCurrentLine' });
    }

    setInterval(() => {
      vscode.setState({ svg: svgElement.innerHTML });
    }, 1000);

  }
}());
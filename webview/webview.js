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
     * Get PNG data URL of canvas or uploaded image
     */
    getPNG() {
      // if there's an uploaded image (e.g., from drag-n-drop), use that
      const holder = document.getElementById("image-holder");
      if (holder.hasAttribute("src")) {
        let src = holder.getAttribute("src");
        // remove it so we don't use it again
        holder.removeAttribute("src");
        return new Promise((resolve, reject) => resolve(src));
      }

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
      img.src = 'data:image/svg+xml;base64,' + btoa(data);

      return new Promise((resolve, reject) => {
        img.onload = function () {
          ctx2.drawImage(img, 0, 0);
          ctx.putImageData(ctx2.getImageData((x - b) * r, (y - b) * r, w * r, h * r), 0, 0);
          resolve(can.toDataURL());
        };
      });
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
          button.onclick = new Function(c.function);
          button.appendChild(icon);

          let custom = document.querySelector('#custom-buttons');
          custom.appendChild(document.createTextNode("\n")); // for some reason, the spacing is off w/o this newline
          custom.appendChild(button);
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
    case 'providerConfigured':
      if (["mathpix"].indexOf(message.provider) > -1) {
        enableDragAndDrop(message.provider);
      }
      break;
    case 'recognize':
      window[message.provider](message.token).then(r => {
        if (r) drawAPI.unstable.editCurrentLine({
          control: 0,
          text: `$$${r}$$`
        });
      });
      break;
    case 'setState':
      switch (message.state) {
        case 'enabled':
          document.querySelector("#svg-save").disabled = false;
          break;
        case 'disabled':
          document.querySelector("#svg-save").disabled = true;
          break;
      }
      break;
  }
});

/**
 * some providers support drag-n-drop so let's add some functionality and
 * styling
 */
function enableDragAndDrop(provider) {

  function getImage(dataTransfer) {
    return new Promise((resolve, reject) => {

      var file = null;
      if (dataTransfer?.items) {
        for (let i = 0; i < dataTransfer.items.length; i++) {
          if (dataTransfer.items[i].type.indexOf('image') !== -1) {
            file = dataTransfer.items[i].getAsFile();
            break;
          }
        }
      } else {
        for (let i = 0; i < dataTransfer.files.length; i++) {
          file = dataTransfer.files[i];
          break;
        }
      }
      if (file) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (event) {
          resolve(event.target.result);
        };
      }
    });

  }

  const container = document.getElementById("svg-container");
  const dragClass = "dragged-over";
  container.ondragenter = function (e) {
    e.target.classList.add(dragClass);
  };
  container.ondragleave = function (e) {
    e.target.classList.remove(dragClass);
  };

  container.ondragover = function (e) {
    e.preventDefault();
    e.target.classList.add(dragClass);
  };
  container.ondragend = function (e) {
    e.preventDefault();
    e.target.classList.remove(dragClass);
  };

  container.ondrop = function (e) {
    e.preventDefault(); // file from being opened
    e.target.classList.remove(dragClass);

    getImage(e.dataTransfer).then((data) => {
      let holder = document.getElementById("image-holder");
      holder.src = data;
      drawAPI.unstable.recognize(provider);
    });
  };

  // container.onpaste = function (e) {
  //   getImage(e.clipboardData).then((data) => {
  //     let holder = document.getElementById("image-holder");
  //     holder.src = data;
  //     drawAPI.unstable.recognize(provider);
  //   });
  // };
}


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
      initPaint("svg");
    } else {
      // or start with drawing under selection
      vscode.postMessage({ command: 'requestCurrentLine' });
    }

    setInterval(() => {
      vscode.setState({ svg: svgElement.innerHTML });
    }, 1000);

  }
}());
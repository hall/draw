function mathpix(token) {

    drawAPI.unstable.getPNG((dataURL) => {
        drawAPI.unstable.setTextContent('calling the API')
        xhrPost(dataURL, (err, ret) => {
            let latex = JSON.parse(ret)['latex']
            let content = '$$' + latex.trim() + '$$ ' + ' '
            drawAPI.unstable.setTextContent('')
            drawAPI.unstable.editCurrentLine({
                control: 0,
                text: content
            })
        })
    })

    function xhrPost(dataURL, callback) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
                    callback(null, xhr.responseText);
                } else {
                    callback([xhr.status, xhr.responseText], null);
                }
            }
        }
        xhr.open('post', 'https://api.mathpix.com/v3/latex');
        xhr.setRequestHeader('app_id', token.id)
        xhr.setRequestHeader('app_key', token.key)
        xhr.setRequestHeader('Content-type', 'application/json')
        xhr.send(JSON.stringify({ 'url': dataURL }));
    }

    // drag and paste image
    function convertImage(dataURL) {
        drawAPI.unstable.setTextContent('calling the API to convert image')
        xhrPost(dataURL, (err, ret) => {
            let latex = JSON.parse(ret)['latex']
            let content = '$$' + latex.trim() + '$$ ' + ' '
            drawAPI.unstable.setTextContent('')
            drawAPI.unstable.editCurrentLine({
                control: 0,
                text: content
            })
        })

    }
    function getImage(items, cb) {
        var file = null;
        if (items && items.length) {
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    file = items[i].getAsFile();
                    break;
                }
            }
        }
        if (file) {
            var reader = new FileReader()
            reader.onload = function (event) {
                cb(event.target.result);
            }
            reader.readAsDataURL(file);
        }
    }
    var bindElement = document.body
    bindElement.addEventListener('paste', function (event) {
        var items = event.clipboardData?.items;
        getImage(items, convertImage);
    });
    bindElement.ondragover = function (ev) {
        ev.preventDefault();
    }
    bindElement.ondrop = function (ev) {
        ev.preventDefault();
        var items = ev.dataTransfer.items;
        getImage(items, convertImage);
    }

    // {"request_id":"xxx","error":"","latex":"\\frac { - b \\pm \\sqrt { b ^ { 2 } - 4 a c } } { 2 a }","latex_list":[],"latex_confidence":0.869140625,"latex_confidence_rate":0.9940518465909091,"detection_map":{"contains_table":0,"contains_chart":0,"contains_diagram":0,"contains_graph":0,"is_blank":0.0008327960968017578,"is_inverted":0,"is_printed":0.00012830943160224706,"is_not_math":0},"detection_list":[],"position":{"top_left_x":6,"top_left_y":3,"width":403,"height":151},"auto_rotate_confidence":0.0008321025474629096,"auto_rotate_degrees":0}
}
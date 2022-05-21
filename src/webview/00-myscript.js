function myscript(token) {

    var getStrokeGroups = () => {
        let strokes = []
        for (const item of svg.children) {
            if (item.nodeName === 'path') {
                let points = item
                    .getAttributeNS(null, "d")
                    .split(/M |L /g)
                    .slice(1)
                    .map(item => {
                        return {
                            x: parseFloat(item.split(",")[0]),
                            y: parseFloat(item.split(",")[1])
                        };
                    })
                strokes.push({ x: points.map(v => v.x), y: points.map(v => v.y) })
            }
        }
        return [{ "penStyle": null, "strokes": strokes }]
    }

    const iinkRecognizer = iink.DefaultBehaviors.recognizerList.find(x => {
        const infos = x.getInfo();
        return infos.protocol === 'REST';
    });

    // Create a empty model
    const model = iink.InkModel.createModel();
    // Filling the model with the stroke groups
    model.strokeGroups = getStrokeGroups()

    // Creating a recognizer context with the configuration attached
    const recognizerContext = iink.RecognizerContext.createEmptyRecognizerContext({
        configuration: iink.DefaultConfiguration
    });

    recognizerContext.editor.configuration.recognitionParams = {
        type: 'MATH',
        protocol: 'REST',
        server: {
            scheme: 'https',
            // host: 'webdemoapi.myscript.com',
            host: 'cloud.myscript.com',
            applicationKey: token.app,
            hmacKey: token.hmac
        },
        iink: {
            math: {
                mimeTypes: [
                    'application/x-latex',
                ],
            }
        }
    }

    // Assigning a theme to the document
    recognizerContext.editor.theme = iink.DefaultTheme;

    // Defining the behaviour on recognition result
    const recognitionCallback = (err, x) => {
        if (!err) {
            Object.entries(x.exports)
                .forEach(([mimeType, exportValue]) => {

                    let latex = x.exports[mimeType]
                    let content = '$$' + latex.trim() + '$$ ' + ' '
                    drawAPI.unstable.setTextContent('')
                    drawAPI.unstable.editCurrentLine({
                        control: 0,
                        text: content
                    })
                });
        }
    };

    // Triggering the recognition
    iinkRecognizer.export_(recognizerContext, model)
        .then((values) => {
            values.forEach((value) => {
                recognitionCallback(undefined, value);
            });
        })
        .catch(err => recognitionCallback(err, undefined));
}

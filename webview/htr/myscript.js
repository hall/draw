function myscript(token) {
    const mimeType = 'application/x-latex';

    // create an empty model
    const model = iink.InkModel.createModel();

    // fill with the stroke groups
    model.strokeGroups = (() => {
        let strokes = [];
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
                    });
                strokes.push({ x: points.map(v => v.x), y: points.map(v => v.y) });
            }
        }
        return [{ "penStyle": null, "strokes": strokes }];
    })();

    // create a recognizer context with the configuration attached
    const recognizerContext = iink.RecognizerContext.createEmptyRecognizerContext({
        configuration: {
            recognitionParams: {
                type: 'MATH',
                protocol: 'REST',
                server: {
                    scheme: 'https',
                    host: 'cloud.myscript.com',
                    applicationKey: token.app,
                    hmacKey: token.hmac
                },
                iink: {
                    math: {
                        mimeTypes: [mimeType],
                    }
                }
            }
        }
    });

    // trigger the recognition
    return iink.DefaultBehaviors.recognizerList
        .find(x => x.getInfo().protocol === 'REST')
        .export_(recognizerContext, model)
        .then(function (r) { return r[0].exports[mimeType].trim(); });
}

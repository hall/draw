function mathpix(token) {
    return new Promise((resolve, reject) => {
        return drawAPI.unstable.getPNG().then((dataURL) => {
            fetch('https://api.mathpix.com/v3/text', {
                method: 'POST',
                headers: {
                    'app_id': token.id,
                    'app_key': token.key,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "src": dataURL,
                }),
            }).then(response => response.json())
                .then(data => {
                    console.log("DATA: " + JSON.stringify(data));
                    if (data["error"]) {
                        reject(data["error"]);
                    } else {
                        resolve(data["latex_styled"].trim());
                    }
                });
        });
    });
}

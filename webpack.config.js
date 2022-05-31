//@ts-check
'use strict';

const path = require('path');
const webpack = require('webpack');


/**@type {import('webpack').Configuration}*/
// eslint-disable-next-line no-undef
module.exports = {
    target: 'webworker', // compatibility with VS Code web
    entry: './src/extension.ts',
    output: {
        // eslint-disable-next-line no-undef
        path: path.resolve(__dirname),
        filename: 'main.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    devtool: 'source-map',
    externals: { // these modules should not be bundled
        crypto: 'commonjs crypto',
        fs: 'commonjs fs',
        path: 'commonjs path',
        vscode: 'commonjs vscode',
    },
    resolve: {
        extensions: ['.ts', '.html'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: 'ts-loader',
            },
            {
                test: /\.html$/i,
                loader: "html-loader",
                options: {
                    preprocessor: async (content, loaderContext) => {
                        const $ = require('cheerio').load(content);
                        const fs = require('fs');
                        const path = require('path');

                        const read = (p) => fs.readFileSync(path.resolve(loaderContext.context, p));

                        try {
                            $('script').each(function () {
                                $(this).text(read($(this).attr("src")));
                                $(this).removeAttr("src");
                            });

                            $('link[rel="stylesheet"]').replaceWith(function () {
                                return $('<style>').text(read($(this).attr("href")));
                            });

                        } catch (error) {
                            await loaderContext.emitError(error);
                            return content;
                        }

                        return $.html();
                    }
                }
            }
        ]
    },
};

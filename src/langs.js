
// return language formatted link to filename; optionally, with alt text
exports.createLink = function (language, filename, alt) {
    // https://hyperpolyglot.org/lightweight-markup
    switch (language) {

        case 'markdown':
            return `![${alt}](${filename})`

        case 'asciidoc':
            return `image::${filename}[${alt}]`

        case 'restructuredtext':
            return `.. image:: ${filename}` // TODO: add alt text `\n   :alt: ${alt}`

        // case 'mediawiki':
        //   return `[[File:${filename}|alt=${alt}]]`

        // case 'org':
        //   return `[[${filename}]]`

    }
}

// return alt text and filename (in that order) from link in language format
exports.readLink = function (language, link) {
    // https://hyperpolyglot.org/lightweight-markup
    let match;
    switch (language) {

        case 'markdown':
            match = link.match(/!\[(.*)\]\((.*)\)/)
            break

        case 'asciidoc':
            match = link.match(/image::(.*)\[(.*)\]/)
            if (match) match.swap(1, 2)
            break

        case 'restructuredtext':
            // TODO: support multiline text for alt
            match = link.match(/..() image:: (.*)/)
            break

        // case 'mediawiki':
        //   match = link.match()
        //   break

        // case 'org':
        //   match = link.match()
        //   break
    }
    if (match) return match[1], match[2]
}

var polymorph = require('./.modules/polymorph');
module.exports = {
    defaultIndex : /* Default single index file settings */{
        executable : false, // do execute?,
        charset : 'utf8', // file encoding
    },
    defaultIndexes : /* Indexes list by default. WARNING!!! All indexes inheriting parents! */ {
        'index.js' : {
            executable : true,
        },
        'index2.html' : {},
    },
    advancedLogging : false,
    serverTimeout : 10000, // 10 secs. to autoclose connection
    mimeTypes : [ // Description of non-executable files mime types (any executable will be returned as text/html)
        [/.*\.js$/,     'application/javascript'], // any non-executable .js file
        [/.*\.css$/,    'text/css'],
        [/.*/,          'application/octet-stream'] // any other file
    ],
    preventImplicitTransfer : 'isFileExecutable, stats, err, url, tmpStack, indexes, retFirstIndex, i, foundIndex, pH, headersClosed, app', // List of variables to prevent implicit passing to the page (to not prevent, clear this list)
    additionalModules : {
        polymorph : polymorph.mainInterface,
    },
    enableFTP : true,
}
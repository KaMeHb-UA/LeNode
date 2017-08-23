var http = require('http'),
    qs = require('querystring'),
    fs = require('fs'),
    router = require('./.router'),
    hosts = require('./.hosts'),

nonDomainDir = process.cwd();

app = {
    mainSettings : require('./.settings'),
    getMime : function(url){
        var got = false, type = '';
        app.mainSettings.mimeTypes.forEach((typeDef) => {
            if(!got && typeof typeDef[0] == 'string' && typeDef[0] == url){
                type = typeDef[1];
                got = true;
            } else if(!got && typeDef[0].test(url)){
                type = typeDef[1];
                got = true;
            }
        });
        return type;
    },
    extends: function(who, from){
        for(var i in from){
            if (who[i] == undefined) who[i] = from[i];
        }
        return who;
    },
};
// empty class for JSDoc
class Objеct /* e is cyrillic ¯\_(ツ)_/¯ (all about pretty code) */ extends Object {};
// custom error definition
class LeNodeError extends Error {
    constructor(message, errno = -1){
        super(message);
        this.errno = errno;
        this.message = errno + ' (' + this.message + ')\nat' + this.stack.split('at', 2)[1]
        this.stack = 'Error ' + this.message;
    }
}

http.createServer(function(request, response){
    var POST = {};
    function do_route(POST){
        process.chdir(nonDomainDir + (function(){
            var routed = false;
            df = '/' + request.headers.host;
            hosts.forEach(function(e){
                if (typeof e[0] == 'string'){
                    if (!routed && e[0] == request.headers.host){
                        df = e[1];
                        routed = true;
                    }
                } else {
                    if (!routed && e[0].flags == '' && e[0].test(request.headers.host)){
                        if (/^\/\^.*\$\/$/.test(e[0].toString())){
                            var regexpText = e[0].toString().slice(2, -2);
                        } else if (/^\/\^.*\/$/.test(e[0].toString())){
                            var regexpText = e[0].toString().slice(2, -1);
                        } else if (/^\/.*\$\/$/.test(e[0].toString())){
                            var regexpText = e[0].toString().slice(1, -2);
                        } else {
                            var regexpText = e[0].toString().slice(1, -1);
                        }
                        e[0] = eval('/^' + regexpText + '$/');
                        df = request.headers.host.replace(e[0], e[1]);
                        routed = true;
                    } else if (!routed && e[0].flags != ''){
                        console.error('Error: host must be described as string or regExp without flags');
                    }
                }
            });
            return df;
        })());
        if (POST == undefined) POST = {};
        var url = decodeURI(request.url.split('?')[0], GET = request.url.split('?')[1]);
        GET = GET ? (function(){
            var params = {};
            GET.split('&').forEach(function(keyval){
                keyval = keyval.split('=');
                if (keyval.length > 1) params[keyval.shift()] = keyval.join('='); else params[keyval.shift()] = '';
            });
            return params;
        })() : {};
        var HeadersSent = false, headers = {'Content-Type': 'text/html;charset=utf-8'}, status = 200;
        function exit(a, b = false){
            if(!HeadersSent){
                response.writeHead(status, headers);
                HeadersSent = true;
            }
            if (b) response.end(a, null); else response.end(a);
        }
        function write(a, b = false){
            if(!HeadersSent){
                response.writeHead(status, headers);
                HeadersSent = true;
            }
            if (b) response.write(a, null); else response.write(a);
        }
        function throwError(c, a, b = false){
            if(!HeadersSent){
                response.writeHead(c, headers);
                HeadersSent = true;
            }
            if (b) response.end(a, null); else response.end(a);
        }
        if (app.mainSettings.asyncInterface){
            route(exit, write, throwError, url, GET, POST, app.extends(POST, GET), request.headers, (request.connection.remoteAddress == '::1') ? 'localhost' : request.connection.remoteAddress, function(a, b = status){
                headers = app.extends(a, headers);
                status = b;
                response.writeHead(status, headers);
                HeadersSent = true;
            }, (err) => {
                if (err) console.error(err);
            });
        } else {
            try {
                routeSync(exit, write, throwError, url, GET, POST, app.extends(POST, GET), request.headers, (request.connection.remoteAddress == '::1') ? 'localhost' : request.connection.remoteAddress, function(a, b = status){
                    headers = app.extends(a, headers);
                    status = b;
                    response.writeHead(status, headers);
                    HeadersSent = true;
                });
            } catch (err){
                console.error(err);
            }
        }
    }
    if (request.method == 'POST'){
        var body = '';
        request.on('data', function (data) {
            body += data;
            if (body.length > 1e8) //10^8 == 100MB
                request.connection.destroy();
        });
        request.on('end', function(){
            POST = qs.parse(body);
            do_route(POST);
        });
    } else do_route();
}).listen(80);
function pathUp(path){ //only canonnical (with / on end) supported
    path = path.split('/');
    var path2 = [];
    for(var i = 0; i < path.length; i++){
        if (i != path.length - 2) path2.push(path[i]);
    }
    path = path2.join('/');
    path2 = undefined;
    return path;
}
/**
 * Gets indexes synchronous
 * @param {String} url The link for getting indexes
 * @return {Objеct}
 */
function getIndexesSync(url){
    return (function(url, _indexes){
        var indexes = (function getIndexes(url, indexes){
            if (url != '/'){
                try {
                    var contents = fs.readFileSync('.' + url + '.indexes', 'utf8');
                    try {
                        indexes = JSON.parse(contents);
                    } catch (e){
                        if (app.mainSettings.advancedLogging) console.error('Error reading indexes from file .' + url + '.indexes');
                    }
                } catch (e){}
                return app.extends(indexes, getIndexes(pathUp(url), indexes));
            } else {
                try {
                    var contents = fs.readFileSync('./.indexes', 'utf8');
                    try {
                        indexes = JSON.parse(contents);
                    } catch (e){
                        if (app.mainSettings.advancedLogging) console.error('Error reading indexes from file .' + url + '.indexes');
                    }
                } catch (e){}
                indexes = app.extends(indexes, app.mainSettings.defaultIndexes);
                return indexes;
            }
        })(url, _indexes);
        for(var i in indexes){
            indexes[i] = app.extends(indexes[i], app.mainSettings.defaultIndex);
        }
        return indexes;
    })(url, {});
}
/**
 * Gets indexes asynchronous
 * @param {String} url The link for getting indexes
 * @param {function(LeNodeError, Objеct):void} callback Standard NodeJS callback
 * @return {Void}
 */
function getIndexes(url, callback){
    (function getIndexesAsyncRecursively(url, _indexes, callback){
        if (url != '/'){
            fs.readFile('.' + url + '.indexes', 'utf8', function(err, contents){
                if (!err){
                    try {
                        getIndexesAsyncRecursively(pathUp(url), app.extends(JSON.parse(contents), _indexes), callback);
                    } catch (e){
                        if (app.mainSettings.advancedLogging) console.error('Error reading indexes from file .' + url + '.indexes');
                        callback(new LeNodeError('cannot parse .' + url + '.indexes file'), null);
                    }
                } else {
                    getIndexesAsyncRecursively(pathUp(url), _indexes, callback);
                }
            });
        } else {
            fs.readFile('./.indexes', 'utf8', function(err, contents){
                if (!err){
                    try {
                        _indexes = app.extends(JSON.parse(contents), _indexes);
                        for(var i in _indexes){
                            _indexes[i] = app.extends(_indexes[i], app.mainSettings.defaultIndex);
                        }
                        callback(null, _indexes);
                    } catch (e){
                        if (app.mainSettings.advancedLogging) console.error('Error reading indexes from file ./.indexes');
                        callback(new LeNodeError('cannot parse ./.indexes file'), null);
                    }
                } else {
                    for(var i in _indexes){
                        _indexes[i] = app.extends(_indexes[i], app.mainSettings.defaultIndex);
                    }
                    callback(null, _indexes);
                }
            });
        }
    })(url, app.mainSettings.defaultIndexes, callback);
}
/**
 * Routs specific URI synchronous
 * @param {function((String|Buffer), boolean=):void} exit Sends info and closes connection (to send buffer instead of string, use second parameter as true)
 * @param {function((String|Buffer), boolean=):void} write Sends info but not closes connection (to send buffer instead of string, use second parameter as true)
 * @param {function(number, string):void} throwError Sends headers with custom code (404, 403 etc.)
 * @param {String} url Link for routing
 * @param {Objеct} GET A $_GET PHP analogue
 * @param {Objеct} POST A $_POST PHP analogue
 * @param {Objеct} REQUEST A $_REQUEST PHP analogue
 * @param {Objеct} headers Associative array like object with all the request headers
 * @param {String} IP Remote user IP adress
 * @param {function(Objеct, number=):void} writeHead Writes headers to the queue (exist headers will be replaced) and/or sets responce code. Works until headers are not sent
 * @return {Void}
 */
function routeSync(exit, write, throwError, url, GET, POST, REQUEST, headers, IP, writeHead){
    if (app.mainSettings.advancedLogging) console.log(IP + ' requested a page ' + url + ' with GET ' + JSON.stringify(GET) + ' and POST ' + JSON.stringify(POST) + ' arguments');
    var isFileExecutable = false;
    (function(){
        var routed = false;
        router.forEach(function(e){
            if (typeof e[0] == 'string'){
                if (!routed && e[0] == url){
                    url = e[1];
                    if (e[2]){
                        isFileExecutable = true;
                    }
                    routed = true;
                }
            } else {
                if (!routed && e[0].test(url)){
                    url = url.replace(e[0], e[1]);
                    if (e[2]){
                        isFileExecutable = true;
                    }
                    routed = true;
                }
            }
        });
    })();
    if (url == '/403.code') throwError(403, 'Not Allowed');
    fs.lstat('.' + url, (err, stats) => {
        if (!err){
            if(stats.isFile() && !isFileExecutable){
                try {
                    var contents = fs.readFileSync('.' + url);
                    writeHead({'Content-Type': app.getMime(url)});
                    exit(contents, true);
                } catch (e){
                    throwError(404, 'Not Found');
                    console.error(new LeNodeError('cannot read file ' + url));
                }
            } else if(stats.isFile()){
                try {
                    var contents = fs.readFileSync('.' + url, 'utf8');
                    var pH = {}, headersClosed = false;
                    try{
                        eval('function page(write,GET,POST,REQUEST,headers,IP,addHeaders,exit,addons' + ((app.mainSettings.preventImplicitTransfer == '') ? '' : (',' + app.mainSettings.preventImplicitTransfer)) + '){' + (function(){
                            varStr = '';
                            for(var i in app.mainSettings.additionalModules){
                                varStr += 'var ' + i + ' = addons["' + i + '"];\n';
                            }
                            return varStr + 'addons = undefined;\n';
                        })() + contents + '}');
                        try{
                            let result = page(function(a){
                                if (!headersClosed){
                                    headersClosed = true;
                                    let status = pH.code ? pH.code : 200;
                                    delete pH.code;
                                    writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=utf8'}), status);
                                }
                                write(a + '');
                            }, GET, POST, REQUEST, headers, IP, function(header){pH=app.extends(header, pH);}, function(a){
                                if (!headersClosed){
                                    let status = pH.code ? pH.code : 200;
                                    delete pH.code;
                                    writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=utf8'}), status);
                                }
                                if (typeof a != 'undefined') exit(a + ''); else exit('');
                            }, app.mainSettings.additionalModules);
                            if (typeof result != 'undefined'){
                                if (!headersClosed){
                                    let status = pH.code ? pH.code : 200;
                                    delete pH.code;
                                    writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=utf8'}), status);
                                }
                                exit(result + '');
                            }
                        } catch (e){
                            throwError(404, 'Not Found');
                            console.error(new LeNodeError('in synchronous part of page ' + url));
                        }
                    } catch (e){
                        throwError(404, 'Not Found');
                        console.error(new LeNodeError('syntax error at file ' + url));
                    }
                } catch (e){
                    throwError(404, 'Not Found');
                    console.error(new LeNodeError('cannot read file ' + url));
                }
            } else {
                if (/\/$/.test(url)){
                    var foundIndex = false;
                    (function(url){
                        var indexes = getIndexesSync(url);
                        for (var i in indexes){
                            if (fs.existsSync('.' + url + i)){
                                foundIndex = {
                                    name : '.' + url + i,
                                    executable : !!(indexes[i].executable),
                                    charset : indexes[i].charset
                                };
                                return;
                            }
                        }
                    })(url);
                    if (!foundIndex) throwError(404, 'Not Found'); else {
                        try {
                            var contents = fs.readFileSync(foundIndex.name, foundIndex.charset);
                            if (foundIndex.executable){
                                let pH = {}, headersClosed = false;
                                try{
                                    eval('function page(write,GET,POST,REQUEST,headers,IP,addHeaders,exit,addons' + ((app.mainSettings.preventImplicitTransfer == '') ? '' : (',' + app.mainSettings.preventImplicitTransfer)) + '){' + (function(){
                                        varStr = '';
                                        for(var i in app.mainSettings.additionalModules){
                                            varStr += 'var ' + i + ' = addons["' + i + '"];\n';
                                        }
                                        return varStr + 'addons = undefined;\n';
                                    })() + contents + '}');
                                    try{
                                        let result = page(function(a){
                                            if (!headersClosed){
                                                headersClosed = true;
                                                let status = pH.code ? pH.code : 200;
                                                delete pH.code;
                                                writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=' + foundIndex.charset}), status);
                                            }
                                            write(a + '');
                                        }, GET, POST, REQUEST, headers, IP, function(header){pH=app.extends(header, pH);}, function(a){
                                            if (!headersClosed){
                                                let status = pH.code ? pH.code : 200;
                                                delete pH.code;
                                                writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=' + foundIndex.charset}), status);
                                            }
                                            if (typeof a != 'undefined') exit(a + ''); else exit('');
                                        }, app.mainSettings.additionalModules);
                                        if (typeof result != 'undefined'){
                                            if (!headersClosed){
                                                let status = pH.code ? pH.code : 200;
                                                delete pH.code;
                                                writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=' + foundIndex.charset}), status);
                                            }
                                            exit(result + '');
                                        }
                                    } catch (e){
                                        throwError(404, 'Not Found');
                                        console.error(new LeNodeError('in synchronous part of page ' + url));
                                    }
                                } catch (e){
                                    throwError(404, 'Not Found');
                                    console.error(new LeNodeError('syntax error at file ' + url));
                                }
                            } else {
                                writeHead({'Content-Type': 'text/html;charset=' + foundIndex.charset}, 200);
                                exit(contents);
                            }
                        } catch (e){
                            throwError(404, 'Not Found');
                            console.error(new LeNodeError('cannot read index file ' + foundIndex.name));
                        }
                    }
                } else {
                    writeHead({'Location': url + '/'}, 302);
                    exit('');
                }
            }
        } else {
            console.error('cannot read file ' + url);
            throwError(404, 'Not Found');
        }
    });
    setTimeout(function(){
        exit('');
    }, app.mainSettings.serverTimeout);
}
/**
 * Routs specific URI asynchronous
 * @param {function((String|Buffer), boolean=):void} exit Sends info and closes connection (to send buffer instead of string, use second parameter as true)
 * @param {function((String|Buffer), boolean=):void} write Sends info but not closes connection (to send buffer instead of string, use second parameter as true)
 * @param {function(number, string):void} throwError Sends headers with custom code (404, 403 etc.)
 * @param {String} url Link for routing
 * @param {Objеct} GET A $_GET PHP analogue
 * @param {Objеct} POST A $_POST PHP analogue
 * @param {Objеct} REQUEST A $_REQUEST PHP analogue
 * @param {Objеct} headers Associative array like object with all the request headers
 * @param {String} IP Remote user IP adress
 * @param {function(Objеct, number=):void} writeHead Writes headers to the queue (exist headers will be replaced) and/or sets responce code. Works until headers are not sent
 * @param {function(LeNodeError):void} callback Standard NodeJS callback
 * @return {Void}
 */
function route(exit, write, throwError, url, GET, POST, REQUEST, headers, IP, writeHead, callback){
    if (app.mainSettings.advancedLogging) console.log(IP + ' requested a page ' + url + ' with GET ' + JSON.stringify(GET) + ' and POST ' + JSON.stringify(POST) + ' arguments');
    var isFileExecutable = false;
    (function(){
        var routed = false;
        router.forEach(function(e){
            if (typeof e[0] == 'string'){
                if (!routed && e[0] == url){
                    url = e[1];
                    if (e[2]){
                        isFileExecutable = true;
                    }
                    routed = true;
                }
            } else {
                if (!routed && e[0].test(url)){
                    url = url.replace(e[0], e[1]);
                    if (e[2]){
                        isFileExecutable = true;
                    }
                    routed = true;
                }
            }
        });
    })();
    if (url == '/403.code') throwError(403, 'Not Allowed');
    fs.lstat('.' + url, (err, stats) => {
        if (!err){
            if(stats.isFile() && !isFileExecutable){
                fs.readFile('.' + url, (err, buffer) => {
                    if (!err){
                        writeHead({'Content-Type': app.getMime(url)});
                        exit(buffer, true);
                        callback(null);
                    } else {
                        throwError(404, 'Not Found');
                        callback(new LeNodeError('cannot read file ' + url));
                    }
                });
            } else if(stats.isFile()){
                fs.readFile('.' + url, 'utf8', (err, contents) => {
                    if (!err){
                        var pH = {}, headersClosed = false;
                        try{
                            eval('function page(write,GET,POST,REQUEST,headers,IP,addHeaders,exit,addons' + ((app.mainSettings.preventImplicitTransfer == '') ? '' : (',' + app.mainSettings.preventImplicitTransfer)) + '){' + (function(){
                                varStr = '';
                                for(var i in app.mainSettings.additionalModules){
                                    varStr += 'var ' + i + ' = addons["' + i + '"];\n';
                                }
                                return varStr + 'addons = undefined;\n';
                            })() + contents + '}');
                            try{
                                let result = page(function(a){
                                    if (!headersClosed){
                                        headersClosed = true;
                                        let status = pH.code ? pH.code : 200;
                                        delete pH.code;
                                        writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=utf-8'}), status);
                                    }
                                    write(a + '');
                                }, GET, POST, REQUEST, headers, IP, function(header){pH=app.extends(header, pH);}, function(a){
                                    if (!headersClosed){
                                        let status = pH.code ? pH.code : 200;
                                        delete pH.code;
                                        writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=utf-8'}), status);
                                    }
                                    if (typeof a != 'undefined') exit(a + ''); else exit('');
                                }, app.mainSettings.additionalModules);
                                if (typeof result != 'undefined'){
                                    if (!headersClosed){
                                        let status = pH.code ? pH.code : 200;
                                        delete pH.code;
                                        writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=utf-8'}), status);
                                    }
                                    exit(result + '');
                                }
                                callback(null);
                            } catch (e){
                                exit('Unable to load file');
                                callback(new LeNodeError('Error in synchronous part of page ' + url));
                            }
                        } catch (e){
                            exit('Unable to load file');
                            callback(new LeNodeError('syntax error at file ' + url));
                        }
                    } else {
                        exit('Unable to load file');
                        callback(new LeNodeError('cannot read file ' + url));
                    }
                });
            } else {
                if (/\/$/.test(url)){
                    getIndexes(url, (err, indexes) => {
                        if (!err){
                            var tmpStack = [];
                            for (var i in indexes){
                                tmpStack.push(i);
                            }
                            (function retFirstIndex(i, url){
                                if (i != tmpStack.length){
                                    fs.access('.' + url + tmpStack[i], (err) => {
                                        if (!err){
                                            ((foundIndex) => {
                                                fs.readFile(foundIndex.name, foundIndex.charset, (err, contents) => {
                                                    if (!err){
                                                        if (foundIndex.executable){
                                                            let pH = {}, headersClosed = false;
                                                            try{
                                                                eval('function page(write,GET,POST,REQUEST,headers,IP,addHeaders,exit,addons' + ((app.mainSettings.preventImplicitTransfer == '') ? '' : (',' + app.mainSettings.preventImplicitTransfer)) + '){' + (function(){
                                                                    varStr = '';
                                                                    for(var i in app.mainSettings.additionalModules){
                                                                        varStr += 'var ' + i + ' = addons["' + i + '"];\n';
                                                                    }
                                                                    return varStr + 'addons = undefined;\n';
                                                                })() + contents + '}');
                                                                try{
                                                                    let result = page(function(a){
                                                                        if (!headersClosed){
                                                                            headersClosed = true;
                                                                            let status = pH.code ? pH.code : 200;
                                                                            delete pH.code;
                                                                            writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=' + foundIndex.charset}), status);
                                                                        }
                                                                        write(a + '');
                                                                    }, GET, POST, REQUEST, headers, IP, function(header){pH=app.extends(header, pH);}, function(a){
                                                                        if (!headersClosed){
                                                                            let status = pH.code ? pH.code : 200;
                                                                            delete pH.code;
                                                                            writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=' + foundIndex.charset}), status);
                                                                        }
                                                                        if (typeof a != 'undefined') exit(a + ''); else exit('');
                                                                    }, app.mainSettings.additionalModules);
                                                                    if (typeof result != 'undefined'){
                                                                        if (!headersClosed){
                                                                            let status = pH.code ? pH.code : 200;
                                                                            delete pH.code;
                                                                            writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=' + foundIndex.charset}), status);
                                                                        }
                                                                        exit(result + '');
                                                                    }
                                                                    callback(null);
                                                                } catch (e){
                                                                    throwError(404, 'Not Found');
                                                                    callback(new LeNodeError('Error in synchronous part of page ' + url));
                                                                }
                                                            } catch (e){
                                                                throwError(404, 'Not Found');
                                                                callback(new LeNodeError('syntax error at file ' + url));
                                                            }
                                                        } else {
                                                            writeHead({'Content-Type': 'text/html;charset=' + foundIndex.charset}, 200);
                                                            exit(contents);
                                                            callback(null);
                                                        }
                                                    } else {
                                                        throwError(404, 'Not Found');
                                                        callback(new LeNodeError('cannot read index file ' + foundIndex.name));
                                                    }
                                                });
                                            })({
                                                name : '.' + url + tmpStack[i],
                                                executable : !!(indexes[tmpStack[i]].executable),
                                                charset : indexes[tmpStack[i]].charset
                                            });
                                        } else retFirstIndex(++i, url);
                                    });
                                } else {
                                    throwError(404, 'Not Found');
                                    callback(null);
                                }
                            })(0, url);
                        } else {
                            throwError(404, 'Not Found');
                            callback(null);
                        }
                    });
                } else {
                    writeHead({'Location': url + '/'}, 302);
                    exit('');
                    callback(null);
                }
            }
        } else {
            throwError(404, 'Not Found');
            callback(null);
        }
    });
    setTimeout(function(){
        exit('');
    }, app.mainSettings.serverTimeout);
}
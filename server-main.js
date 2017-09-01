var http = require('http'),
    qs = require('querystring'),
    fs = require('fs'),
    hosts = require('./.hosts'),
    mkdirp = require('mkdirp'),
    dateTime = require('node-datetime'),
    
nonDomainDir = process.cwd(),
projectName = (function(a){a=a.split('/');a=a[a.length-1];a=a.split('\\');return a[a.length-1];})(nonDomainDir),

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
    evalSafe: function(text){
        return eval(
            '(function(app, router, window, http, fs, hosts, qs, process, exit, callback, err, contents, data, write, throwError, url, GET, POST, REQUEST, headers, IP, writeHead){ return (' +
            text
            + ')})({mainSettings: app.mainSettings, getMime: app.getMime, extends: app.extends, defaultRouter: app.defaultRouter})'
        );
    },
    defaultRouter: [
        [ /.*\/\.indexes\/*$/, '/403.code' ],
        [ /^\/?\.router\.js\/*$/, '/403.code' ],
    ],
    log: function(modulename, message){
        console.log('\\033[36m' + dateTime.create().format('[d-m-y H:M:S]') + '\\033[32m ' + projectName + ' ' + modulename + ':\\033[0m ' + message);
    },
    warn: function(modulename, message){
        console.log('\\033[36m' + dateTime.create().format('[d-m-y H:M:S]') + '\\033[33m ' + projectName + ' ' + modulename + ' warning:\\033[0m ' + message);
    },
    err: function(modulename, message){
        console.log('\\033[36m' + dateTime.create().format('[d-m-y H:M:S]') + '\\033[31m ' + projectName + ' ' + modulename + ' error:\\033[0m ' + message);
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
                        e[0] = app.evalSafe('/^' + regexpText + '$/');
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
        route(exit, write, throwError, url, GET, POST, app.extends(POST, GET), request.headers, (request.connection.remoteAddress == '::1') ? 'localhost' : request.connection.remoteAddress, function(a, b = status){
            headers = app.extends(a, headers);
            status = b;
            response.writeHead(status, headers);
            HeadersSent = true;
        }, app.defaultRouter, (err) => {
            if (err) app.err('server', err);
        });
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

// Setting up FTP

if (app.mainSettings.enableFTP){
    let FTPD = require('ftp-srv'),
        ftpServer = new FTPD('ftp://0.0.0.0:21', {
            log : {
                info : (data, message) => {
                    if (message) app.log('FTP', message);
                }
            }
        });
    ftpServer.on('login', (data, resolve, reject) => {
        fs.readFile(nonDomainDir + '/.ftp.js', 'utf8', (err, settings) => {
            if (!err){
                try{
                    eval(settings);
                    if(settings[data.username] && settings[data.username].pass && settings[data.username].pass == data.password){
                        let compare = (strReg, compareWith) => {
                            if (!compareWith) return true;
                            if (typeof strReg == 'string'){
                                return strReg == compareWith;
                            } else {
                                return strReg.test(compareWith);
                            }
                        },
                        //* fs private methods (remove first slash to comment it)
                        _getRealPath = function(path, _this){
                            path = _this._resolvePath(path).fsPath.slice(nonDomainDir.length).replace(/\\/g, '/');
                            if (path[0] != '/') path = '/' + path;
                            return path;
                        },
                        _notInDirect = function(path){
                            var fn = path.split('/');
                            return path == '/' || !(fn[1] && compare(settings[data.username].direct, fn[1]));
                        },
                        _checkFileExists = s => new Promise(r => fs.access(s, fs.F_OK, e => r(!e))),
                        _mkdirp = s => new Promise(r => mkdirp(s, e => r(!e)));
                        //*/;
                        resolve({
                            fs : new (class extends FTPD.FileSystem{
                                constructor(connection, {root, cwd} = {}){
                                    super(connection, {root: root, cwd: cwd});
                                }
                                // must to block some functions for different accounts
                                get(fileName){
                                    return _checkFileExists(this._resolvePath(fileName).fsPath).then((exists) => {
                                        if (!exists) return false; else return super.get(fileName);
                                    });
                                }
                                chdir(path = '.'){
                                    if(compare(settings[data.username].direct, (() => {
                                        var a = path.split('/');
                                        if (a.length == 1) return;
                                        return a[1];
                                    })())) return _mkdirp(this._resolvePath(path).fsPath).then(s => {
                                        if (!s) return false; else return super.chdir(path);
                                    })
                                }
                                list(path = '.'){
                                    var rPath = _getRealPath(path, this);
                                    return super.list(path).then(list => {
                                        if (rPath == '/'){
                                            let newList = [];
                                            list.forEach(statObj => {
                                                if (compare(settings[data.username].direct, statObj.name)) newList.push(statObj);
                                            });
                                            return newList;
                                        } else {
                                            if(compare(settings[data.username].direct, rPath.split('/')[1])) return list; else return [];
                                        }
                                    });
                                }
                                /*
                                write(fileName, {append = false, start = undefined} = {}){
                                    if (_notInDirect(fileName)) return fs.createWriteStream('/dev/null', {mode: 0o000}); else return super.write(fileName, {append: append, start: start});
                                }
                                /*///*
                                write(fileName, {append = false, start = undefined} = {}){
                                    var fsp = this._resolvePath(fileName).fsPath;
                                    return _checkFileExists(fsp).then((exists) => {
                                        if (_notInDirect(fileName)) return fs.createWriteStream('/dev/null', {mode: 0o000}); else {
                                            if (exists) return super.write(fileName, {append: append, start: start}); else {
                                                return _mkdirp((function(a){
                                                    a = a.split('/');
                                                    if (a.length > 1){
                                                        a[a.length - 1] = '';
                                                    }
                                                    a = a.join('/');
                                                    a = a.split('\\');
                                                    if (a.length > 1){
                                                        a[a.length - 1] = '';
                                                    }
                                                    return a.join('\\');
                                                })(fsp)).then(s => {
                                                    if (!s) return fs.createWriteStream('/dev/null', {mode: 0o000}); else {
                                                        fs.writeFileSync(fsp, Buffer.alloc(0));
                                                        return super.write(fileName, {append: append, start: start});
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                                //*/
                                read(fileName, {start = undefined} = {}){
                                    if (_notInDirect(fileName)) return fs.createReadStream('/dev/null', {mode: 0o000}); else return super.read(fileName, {start: start});
                                }
                                delete(path){
                                    if (_notInDirect(path)) return; else return super.delete(path);
                                }
                                mkdir(path){
                                    if (_notInDirect(path)) return; else return super.mkdir(path);
                                }
                                rename(from, to){
                                    if (_notInDirect(from) || _notInDirect(to)) return; else return super.rename(from, to);
                                }
                                chmod(path, mode){
                                    if (_notInDirect(path)) return; else return super.chmod(path, mode);
                                }
                            })(data.connection, {root:nonDomainDir})
                        });
                    } else {
                        reject({message: 'Error: cannot authenticate. Check your username and password'});
                    }
                } catch (e){
                    reject({message: 'Error: .ftp file is not set propertly yet. Try another time'});
                }
            } else reject({message: 'Error: .ftp file is not set propertly yet. Try another time'});
        });
    });
    ftpServer.listen();   
}

// Done

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
 * Gets indexes
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
 * Routs specific URI
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
 * @param {Array<Array<(String|RegExp)>>} router Specifies a router to be used by default
 * @param {function(LeNodeError):void} callback Standard NodeJS callback
 * @return {Void}
 */
function route(exit, write, throwError, url, GET, POST, REQUEST, headers, IP, writeHead, router, callback){
    if (app.mainSettings.advancedLogging) app.log('server', IP + ' requested a page ' + url + ' with GET ' + JSON.stringify(GET) + ' and POST ' + JSON.stringify(POST) + ' arguments');
    var isFileExecutable = false;
    fs.readFile('./.router', 'utf8', (err, contents) => {
        if (!err){
            try{
                router = app.evalSafe(contents);
            } catch(e){
                console.error('File ' + nonDomainDir + '/.router is not configured propertly');
            }
        }
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
    });
}
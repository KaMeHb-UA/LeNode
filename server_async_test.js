var http = require('http'),
    qs = require('querystring'),
    fs = require("fs"),
    polymorph = require('./polymorph'),
    wait = require('wait.for');

var app = {
    extends: function(who, from){
        for(var i in from){
            if (who[i] == undefined) who[i] = from[i];
        }
        return who;
    },

/* Пользовательские настройки */

    mainSettings : {
        defaultIndex : /* Настройки индекстного файла по умолчанию */{
            executable : false, //выполнять ли файл,
            charset : 'utf8', //кодировка
        },
        defaultIndexes : /* Список индексов для корневой директории по умолчанию. ВНИМАНИЕ!!! Индексы всех папок наследуются от родителей! */ {
            'index.js' : {
                executable : true,
            },
            'index2.html' : {},
        },
//        advancedLogging : true,
        serverTimeout : 10000, // 10 сек. на автозакрытие соединения
    }
};
http.createServer(function(request, response){
    var POST = {};
    function do_route(POST){
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
        /*
        route(exit, write, throwError, url, GET, POST, app.extends(POST, GET), request.headers, (request.connection.remoteAddress == '::1') ? 'localhost' : request.connection.remoteAddress, function(a, b = status){
            headers = app.extends(a, headers);
            status = b;
            response.writeHead(status, headers);
            HeadersSent = true;
        });
        */
        wait.launchFiber(route, exit, write, throwError, url, GET, POST, app.extends(POST, GET), request.headers, (request.connection.remoteAddress == '::1') ? 'localhost' : request.connection.remoteAddress, function(a, b = status){
            headers = app.extends(a, headers);
            status = b;
            response.writeHead(status, headers);
            HeadersSent = true;
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
function getIndexes(url, _indexes = {}){
    var indexes = (function getIndexes(url, indexes){
        if (url != '/'){
            try {
                var contents = wait.for(fs.readFile, '.' + url + '.indexes', 'utf8');
                try {
                    indexes = JSON.parse(contents);
                } catch (e){
                    if (app.mainSettings.advancedLogging) console.error('Ошибка чтения индексов из файла .' + url + '.indexes');
                }
            } catch (e){}
            return app.extends(indexes, getIndexes(pathUp(url), indexes));
        } else {
            try {
                var contents = wait.for(fs.readFile, './.indexes', 'utf8');
                try {
                    indexes = JSON.parse(contents);
                } catch (e){
                    if (app.mainSettings.advancedLogging) console.error('Ошибка чтения индексов из файла .' + url + '.indexes');
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
}
function route(exit, write, throwError, url, GET, POST, REQUEST, headers, IP, writeHead){
    if (app.mainSettings.advancedLogging) console.log(IP + ' requested a page ' + url + ' with GET ' + JSON.stringify(GET) + ' and POST ' + JSON.stringify(POST) + ' arguments');
    isFileExecutable = false;
    (function(){
        var routed = false;
        require('./router').forEach(function(e){
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
    if (url == '/404.code') throwError(404, 'Not Found');
    var do_close = false;
    try {
        var stats = wait.for(fs.lstat, '.' + url);
    } catch (e){
        do_close = true;
        throwError(404, 'Not Found');
    }
    if (do_close) return;
    if(stats.isFile() && !isFileExecutable){
        try {
            var contents = wait.for(fs.readFile, '.' + url);
            writeHead({'Content-Type': 'application/octet-stream'});
            exit(contents, true);
        } catch (e){
            exit('Unable to load file');
        }
        return; //не, ну тут полюбасу
    } else if(stats.isFile()){
        try {
            var contents = wait.for(fs.readFile, '.' + url, 'utf8');
            var pH = {}, headersClosed = false;
            //eval('function page(write,GET,POST,REQUEST,headers,IP,addHeaders,polymorph,___xFn_FM_CB){var exit = function(a){___xFn_FM_CB(null, a)};' + contents + '}');
            eval('function page(write,GET,POST,REQUEST,headers,IP,addHeaders,polymorph,exit){' + contents + '}');
            exit((function(){
                var a = wait.for(page, function(a){
                    if (!headersClosed){
                        headersClosed = true;
                        let status = pH.code ? pH.code : 200;
                        delete pH.code;
                        writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=utf-8'}), status);
                    }
                    write(a + '');
                }, GET, POST, REQUEST, headers, IP, function(header){pH=app.extends(header, pH);}, polymorph.mainInterface) + '';
                if (!headersClosed){
                    let status = pH.code ? pH.code : 200;
                    delete pH.code;
                    writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=utf-8'}), status);
                }
                return a;
            })());
        } catch (e){
            exit('Unable to load file');
        }
        return; //не, ну тут тоже полюбасу
    } else {
        var foundIndex = false;
        (function(url){
            var indexes = getIndexes(url);
            for (var i in indexes){
                if (wait.for(fs.access, '.' + url + i)){
                    foundIndex = {
                        name : '.' + url + i,
                        executable : !!(indexes[i].executable),
                        charset : indexes[i].charset
                    };
                }
            }
        })(/\/$/.test(url) ? url : (url + '/'));
        if (!foundIndex) throwError(404, 'Not Found'); else {
            try {
                var contents = wait.for(fs.readFile, foundIndex.name, foundIndex.charset);
                try {
                    var pH = {}, headersClosed = false;
                    eval('function page(write,GET,POST,REQUEST,headers,IP,addHeaders,polymorph,___xFn_FM_CB){___xFn_FM_CB(null, (function(___xFn_FM_CB){' + contents + '})())}');
                    exit((function(){
                        var a = wait.for(page, function(a){
                            if (!headersClosed){
                                headersClosed = true;
                                let status = pH.code ? pH.code : 200;
                                console.log(status);
                                delete pH.code;
                                writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=' + foundIndex.charset}), status);
                            }
                            write(a + '');
                        }, GET, POST, REQUEST, headers, IP, function(header){pH=app.extends(header, pH);}, polymorph.mainInterface) + '';
                        if (!headersClosed){
                            let status = pH.code ? pH.code : 200;
                            delete pH.code;
                            writeHead(app.extends(pH, {'Content-Type': 'text/html;charset=' + foundIndex.charset}), status);
                        }
                        return a;
                    })());
                    page = undefined;
                    pH = {};
                } catch (e){
                    exit(e.stack);
                }
            } catch (e){
                exit('Error: cannot read index file');
            }
        }
    }
    /*
    setTimeout(function(){
        exit();
    }, app.mainSettings.serverTimeout);
    */
}
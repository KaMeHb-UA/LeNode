var http = require('http');
var qs = require('querystring');
var fs = require("fs");
var polymorph = require('./polymorph');

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
        advancedLogging : true,
        serverTimeout : 10000, // 10 сек. на автозакрытие соединения
        asyncInterface : false, // Вкл/выкл асинхронный режим сервера. Влияет только на сам сервер; страницы же могут быть написаны любым подходом
    }
};
// класс-пустышка для JSDoc
class Objеct /* e кириллическая ¯\_(ツ)_/¯ (всё для красивого кода) */ extends Object {};
// настроим свой тип ошибок
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
function pathUp(path){ // поддерживается только канонический (путь) (с / в конце)
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
 * Получает индексы синхронно
 * @param {String} url Путь для получения индексов
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
                        if (app.mainSettings.advancedLogging) console.error('Ошибка чтения индексов из файла .' + url + '.indexes');
                    }
                } catch (e){}
                return app.extends(indexes, getIndexes(pathUp(url), indexes));
            } else {
                try {
                    var contents = fs.readFileSync('./.indexes', 'utf8');
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
    })(url, {});
}
/**
 * Получает индексы асинхронно
 * @param {String} url Путь для получения индексов
 * @param {function(LeNodeError, Objеct):void} callback Обычный NodeJS-коллбэк
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
                        if (app.mainSettings.advancedLogging) console.error('Ошибка чтения индексов из файла .' + url + '.indexes');
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
                        if (app.mainSettings.advancedLogging) console.error('Ошибка чтения индексов из файла ./.indexes');
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
 * Направляет заданую ссылку синхронно
 * @param {function((String|Buffer), boolean=):void} exit Отправляет информацию и закрывает соединение (чтобы отправить буфер вместо строки, используйте второй параметр как true)
 * @param {function((String|Buffer), boolean=):void} write Отправляет информацию, но не закрывает соединение (чтобы отправить буфер вместо строки, используйте второй параметр как true)
 * @param {function(number, string):void} throwError Отправляет заголовки с произвольным кодом ответа (404, 403 и т.п.)
 * @param {String} url Сама ссылка для направления
 * @param {Objеct} GET $_GET PHP аналог
 * @param {Objеct} POST $_POST PHP аналог
 * @param {Objеct} REQUEST $_REQUEST PHP аналог
 * @param {Objеct} headers Объект (ассоциативный массив) со всеми заголовками запроса
 * @param {String} IP IP адрес пользователя
 * @param {function(Objеct, number=):void} writeHead Пишет заголовки в очередь (существующие будут заменены) и/или задаёт код ответа. Работает до первой отправки заголовков
 * @return {Void}
 */
function route(exit, write, throwError, url, GET, POST, REQUEST, headers, IP, writeHead){
    if (app.mainSettings.advancedLogging) console.log(IP + ' запросил страницу ' + url + ' с GET ' + JSON.stringify(GET) + ' и POST ' + JSON.stringify(POST) + ' аргументами');
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
    fs.lstat('.' + url, (err, stats) => {
        if (!err){
            if(stats.isFile() && !isFileExecutable){
                try {
                    var contents = fs.readFileSync('.' + url);
                    writeHead({'Content-Type': 'application/octet-stream'});
                    exit(contents, true);
                } catch (e){
                    exit('Unable to load file');
                }
            } else if(stats.isFile()){
                try {
                    var contents = fs.readFileSync('.' + url, 'utf8');
                    var pH = {}, headersClosed = false;
                    eval('function page(write,GET,POST,REQUEST,headers,IP,addHeaders,polymorph){' + contents + '}');
                    exit((function(){
                        var a = page(function(a){
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
            } else {
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
                })(/\/$/.test(url) ? url : (url + '/'));
                if (!foundIndex) throwError(404, 'Not Found'); else {
                    try {
                        var contents = fs.readFileSync(foundIndex.name, foundIndex.charset);
                        try {
                            var pH = {}, headersClosed = false;
                            eval('function page(write,GET,POST,REQUEST,headers,IP,addHeaders,polymorph){' + contents + '}');
                            exit((function(){
                                var a = page(function(a){
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
        } else {
            throwError(404, 'Not Found');
        }
    });
    setTimeout(function(){
        exit();
    }, app.mainSettings.serverTimeout);
}
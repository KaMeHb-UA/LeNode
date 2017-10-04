require('colors');
var fs = require('fs'),
    dateTime = require('node-datetime'),
    nodemon = require('nodemon'),
    projectFolder = (a=>{a.pop();return a.join('/')})(process.mainModule.filename.split('/')),
    projectName = (a=>{return a[a.length-1]})(projectFolder.split('/')),
    rimraf = require('rimraf'),
    mv = require('mv'),
    unzip = require('unzip'),
    mkdirp = require('mkdirp'),
    request = require('request');
(function startMain(){
    var app = {
        log : (heading, text)=>{
            console.log(dateTime.create().format('[d-m-y H:M:S]').cyan + ' ' + projectName.green + ' ' + heading.green + ': '.green + text);
        },
        warn : (heading, text)=>{
            console.log(dateTime.create().format('[d-m-y H:M:S]').cyan + ' ' + projectName.yellow + ' ' + heading.yellow + ': '.yellow + text);
        },
        err : (heading, text)=>{
            console.log(dateTime.create().format('[d-m-y H:M:S]').cyan + ' ' + projectName.red + ' ' + heading.red + ': '.red + text);
        }
    }
    function searchForUpdate(currentVersion, callback){
        request({
            url: 'https://api.github.com/repos/KaMeHb-UA/LeNode/releases/latest',
            headers: {
              'User-Agent': 'LeNode ' + currentVersion
            },
            json: true
          }, (err, res, body) => {
            if (err) callback(err, null);
            else callback(null, 
            {
                latest: body.tag_name,
                url: body.assets[0].browser_download_url
            });
          });
    }
    fs.readdir(projectFolder + '/app', (e, files)=>{
        if(e){
            app.err('server', 'cannon get current app. Check your ./app folder and try again or just reinstall the app. Full stack is there:\n');
            //console.log(dateTime.create().format('[d-m-y H:M:S]').cyan + ' ' + projectName.red + ' server: cannon get current app. Check your ./app folder and try again or just reinstall the app. Full stack is there:\n'.red);
            throw e;
        } else {
            let maxV = '0.0.0';
            files.forEach((version)=>{
                function getVersion(v){
                    var res = /(\d+)\.(\d+)\.(\d+)(-[a-z])?/.exec(v);
                    return {
                        version : res[1],
                        major : res[2],
                        minor : res[3],
                        revision : (a=>{
                            if (a) return a.slice(1,2).charCodeAt(0); else return 0;
                        })(res[4])
                    };
                }
                var maxVersion = getVersion(maxV), curVersion = getVersion(version);
                if (
                    curVersion.version > maxVersion.version ||
                    (curVersion.version == maxVersion.version && curVersion.major > maxVersion.major) ||
                    (curVersion.version == maxVersion.version && curVersion.major == maxVersion.major && curVersion.minor > maxVersion.minor) ||
                    (curVersion.version == maxVersion.version && curVersion.major == maxVersion.major && curVersion.minor == maxVersion.minor && curVersion.revision > maxVersion.revision)
                ) maxV = version;
            });
            //console.log(dateTime.create().format('[d-m-y H:M:S]').cyan + ' ' + projectName.green + ' server:'.green + ' loading LeNode v.' + maxV);
            function startServer(){
                app.log('server', 'loading LeNode v.' + maxV);
                return nodemon({
                    script: projectFolder + '/app/' + maxV + '/server.js'
                }).on('restart', function(fn){
                    app.warn('server restarted due to', fn);
                    //console.log(dateTime.create().format('[d-m-y H:M:S]').cyan + ' ' + projectName.yellow + ' server restarted due to: '.yellow + fn);
                });
            }
            var startedScript = startServer();
            searchForUpdate(maxV, (err,data)=>{
                app.log('server', 'searching updates');
                if(!err && data.latest != maxV){
                    rimraf(projectFolder + '/.tmp/', (e)=>{
                        if (!e){
                            let versionFolder = projectFolder + '/.tmp/' + data.latest;
                            mkdirp(versionFolder, (r)=>{
                                if (!r){
                                    let file = fs.createWriteStream(versionFolder + '.zip');
                                    app.log('server', 'downloading update... This may take awhile');
                                    request(data.url).pipe(file).on('finish', ()=>{
                                        file.close();
                                        fs.createReadStream(versionFolder + '.zip').pipe(unzip.Extract({
                                            path: versionFolder
                                        })).on('close', ()=>{
                                            mv(versionFolder + '/app/' + data.latest, projectFolder + '/app/' + data.latest, ()=>{
                                                maxV = data.latest;
                                                rimraf(projectFolder + '/.tmp/', ()=>{
                                                    var timeout = 1000;
                                                    app.warn('server', 'restarting due to update...');
                                                    startedScript.emit('quit');
                                                    app.log('server', 'will be started after ' + timeout + 'ms...');
                                                    setTimeout(()=>{
                                                        startMain();
                                                    }, timeout);
                                                });
                                            });
                                        });
                                    });
                                }
                            });
                        }
                    });
                } else {
                    app.log('server info', 'your server has an actual LeNode version');
                    startedScript.once('exit', ()=>{process.exit()})
                }
            });
        }
    })
})();
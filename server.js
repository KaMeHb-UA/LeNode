require('colors');
var fs = require('fs'),
    dateTime = require('node-datetime'),
    nodemon = require('nodemon'),
    projectFolder = (a=>{a.pop();return a.join('/')})(process.mainModule.filename.split('/')),
    projectName = (a=>{return a[a.length-1]})(projectFolder.split('/'));
(function start(){
    fs.readdir(projectFolder + '/app', (e, files)=>{
        if(e){
            console.log(dateTime.create().format('[d-m-y H:M:S]').cyan + ' ' + projectName.red + ' server: cannon get current app. Check your ./app folder and try again or just reinstall the app. Full stack is there:\n'.red);
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
            console.log(dateTime.create().format('[d-m-y H:M:S]').cyan + ' ' + projectName.green + ' server:'.green + ' loading LeNode v.' + maxV);
            nodemon({
                script: projectFolder + '/app/' + maxV + '/server-main.js'
            }).on('restart', function(fn){
                console.log(dateTime.create().format('[d-m-y H:M:S]').cyan + ' ' + projectName.yellow + ' server restarted due to: '.yellow + fn);
            });
        }
    })
})();
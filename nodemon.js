var nodemon = require('nodemon'),
    dateTime = require('node-datetime'),
    projectName = (function(a){a=a.split('/');a=a[a.length-1];a=a.split('\\');return a[a.length-1];})(process.cwd());

nodemon({ script: 'server-main.js' }).on('restart', function(fn){
    console.log('\\033[36m' + dateTime.create().format('[d-m-y H:M:S]') + '\\033[33m ' + projectName + ' server restarted due to:\\033[0m ' + fn);
});
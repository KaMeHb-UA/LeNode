write('You must wait 5 seconds before page loads...<br/>');
//*
var a = wait.for(function(callback1){
    setTimeout(function(){
        callback1(null, 'Hell O MFs');
    }, 100);
}); // a now must be 'Hell O MFs'
//*/
exit(null, a);
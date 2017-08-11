[LeNode](https://lenode-server.github.io/) is a lesser (minimalistic) NodeJS based Web-server
## Features
#### - Easy setup
You can setup your server by creating .indexes files by JSON format in any directory like this:
```` json
{
    "index_own.js" : {
        "executable" : true,
        "charset" : "utf8"
    },
    "second_own_index.html" : {
        "charset" : "win1251"
    },
    "third_own_index.ext" : {}
}
````
You can execute any file with any extension as a JS file. Any directory will get its parent indexes if you don't overwrite them
Next, your executable pages must be created wrapped in page() function like this
```` javascript
page(
    write, // function that writes contents directly to page without buffering
    GET, // GET object (PHP analogue)
    POST, // POST object (PHP analogue)
    REQUEST, // REQUEST object (PHP analogue)
    headers, // request headers
    IP, // remote client IP
    addHeaders, // function that adds headers to queue (if you're used write(), headers will be placed no more). For setting responce code, you may use addHeaders({code:200}) (200 is default). If you will set an existing header, it will be overwrited by new
    polymorph // a function, that ables you easily to create an overflowed functions. Usage:
    /*
        var func = polymorph(
            function(a,b,c){return '3 any args passed';},
            {i: String, a: Boolean},
            function(i,a){return 'Passed string and boolean';}
        );
    */
    ){
    return 'Hell O MFs';
}
````

#### - Lightweight
On Windows 10 machine it using ~8-9 MBs of memory

#### - Extensible
Any changes (excluding main server file) will be applied immediately, there are no need to restart the server

function page(
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
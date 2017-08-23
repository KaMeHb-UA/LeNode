module.exports = [
    //host must be described as string or regExp without flags
    [ /(localhost|192\.168\.\d{1,3}\.\d{1,3}|127\.0\.0\.1)/, '/localhost' ], // any request to "local" address will be redirected to /localhost folder
    [ /.*/, '/not-existent-host' ],
]
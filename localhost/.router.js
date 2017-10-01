[
    [ /.*\/\.indexes\/*$/, '/403.code' ],
    [ /^\/?\.router\.js\/*$/, '/403.code' ],
    [ '/execute', '/me.ext', true /* now /me.ext is executable but only from url /execute */],
    [ /\/*(tests\/a?sync_test.js)\/*$/, '/$1', true /* tests files async_test.js and sync_test.js are executable from own url */],
    [ /\/*(tests\/.*\.js)\/*$/, '/$1', false /* all other .js files in /tests/ are now not executable from own url and urls with slashes at the end */],
    [ /\/*(.*\.js)\/*$/, '$1', true /* all other .js files are now executable from own url and urls with slashes at the end */],
]
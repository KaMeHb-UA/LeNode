/**
 * Visual Studio Code highlight addon for prism (JavaScript)
 * @author KaMeHb
 * Note: Need to be loaded after prism!
 */
document.addEventListener('DOMContentLoaded', function(){
    var specials = [
            'function',
            'var',
            'in',
            {
                pre : [')', 'punctuation'],
                content : '=>',
                post : ['{','punctuation']
            },
            {
                pre : [')', 'punctuation'],
                content : '=&gt;',
                post : ['{','punctuation']
            },
            {
                pre : [')', 'punctuation'],
                content : '=&#62;',
                post : ['{','punctuation']
            },
            'extends',
            'let',
            'delete',
        ],
        builtins = [
            'console',
            'JSON',
            'Object',
            'RegExp',
            'Array',
            'String',
            'Boolean',
            'NodeList',
        ],
        cantToBeFunctionsNames = [
            'function',
            'catch',
            'return',
            'var',
            'if',
            'for',
            'while',
        ];
    function eq($elem, toEq){
        if (Object.prototype.toString.call(toEq) === '[object Array]'){
            if ($elem.html() == toEq[0] && $elem.hasClass(toEq[1])){
                return true;
            }
        } else {
            if ($elem.html() == toEq){
                return true;
            }
        }
        return false;
    }
    $('code.language-javascript').each(function(){
        var $this = $(this),
            spans = $this.find('span');
        spans.each(function(i){
            var $this = $(this);
            specials.forEach(function(r){
                if (typeof r == 'object'){
                    if (eq($this, r.pre) && eq($(spans[i + 1]), r.content) && eq($(spans[i + 2]), r.post)){
                        $(spans[i + 1]).addClass('special');
                    }
                } else if (typeof r == 'string'){
                    if ($this.html() == r) $this.addClass('special');
                }
            });
            if ($(spans[i + 1]).html() == '(' && cantToBeFunctionsNames.indexOf($this.html()) == -1 && ($this.hasClass('builtin') || $this.hasClass('keyword'))) $this.attr('class','token function');
        });
        var regExPat = '>([^<>]*[^A-Za-z]{1,}|[^A-Za-z]*){%builtin%}([^A-Za-z]{1,}[^<>]*|[^A-Za-z]*)<';
        builtins.forEach(function(r){
            regEx = new RegExp(regExPat.replace('{%builtin%}', r),'g');
            $this.html($this.html().replace(regEx, function(str, bef, aft){
                return '>' + bef + '<span class="token builtin">' + r + '</span>' + aft + '<';
            }));
        });
        function parseRegExPart(part){
            return part.replace(/([^\\])(\.|\+|\?|\||(\{\d{1,}(,\d*)?\})|\*)/g, function(str, firstSymb, punctuation){
                return firstSymb + '<span class="token regex-punctuation">' + punctuation + '</span>';
            }).replace(/([^\\])\[(\^)([^\]]*[^\\\]])\]/g, function(str, firstSymb, punctuation, otherPhrase){
                return firstSymb + '[<span class="token regex-punctuation">' + punctuation + '</span>' + otherPhrase + ']';
            });
        }
        $this.find('span.regex').each(function(){
            var $this = $(this),
                regex = $this.html();
            if (/^\/\^(.*)\$\/[a-z]*$/.test(regex)){
                $this.html(regex.replace(/^\/\^(.*)\$\/([a-z]*)$/, function(str, inside, mods){
                    return  '/<span class="token regex-special">^</span>' + parseRegExPart(inside) + '<span class="token regex-special">$</span>/' + (mods ? ('<span class="token regex-mod">' + mods + '</span>') : '');
                }));
            } else if (/^\/(.*)\$\/[a-z]*$/.test(regex)){
                $this.html(regex.replace(/^\/(.*)\$\/([a-z]*)$/, function(str, inside, mods){
                    return  '/' + parseRegExPart(inside) + '<span class="token regex-special">$</span>/' + (mods ? ('<span class="token regex-mod">' + mods + '</span>') : '');
                }));
            } else if (/^\/\^(.*)\/[a-z]*$/.test(regex)){
                $this.html(regex.replace(/^\/\^(.*)\/([a-z]*)$/, function(str, inside, mods){
                    return  '/<span class="token regex-special">^</span>' + parseRegExPart(inside) + '/' + (mods ? ('<span class="token regex-mod">' + mods + '</span>') : '');
                }));
            } else {
                $this.html(regex.replace(/^\/(.*)\/([a-z]*)$/, function(str, inside, mods){
                    return  '/' + parseRegExPart(inside) + '/' + (mods ? ('<span class="token regex-mod">' + mods + '</span>') : '');
                }));
            }
        });
        $this.find('span.comment').each(function(){
            $(this).find('*').each(function(){
                $(this)[0].outerHTML = $(this).html();
            });
        });
    });
});
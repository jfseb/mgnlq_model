"use strict";
/**
 * @file
 * @module jfseb.mgnlq_model.breakdown
 * @copyright (c) 2016 Gerd Forstmann
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.breakdownString = exports.makeMatchPattern = exports.tokenizeString = exports.combineTokens = exports.isCombinableRangeReturnIndex = exports.isCombinableSplit = exports.swallowWord = exports.swallowQuote = exports.countSpaces = exports.isQuoted = exports.recombineQuoted = exports.trimQuotedSpaced = exports.trimQuoted = exports.cleanseQuotedString = exports.cleanseStringLeaveDots = exports.cleanseString = void 0;
const debug = require("debug");
const debuglog = debug('breakdown');
function cleanseString(sString) {
    var len = 0;
    while (len !== sString.length) {
        len = sString.length;
        sString = sString.replace(/\s+/g, ' ');
        sString = sString.replace(/^\s+/, '');
        sString = sString.replace(/\s+$/, '');
        sString = sString.replace(/^[,;.]+/, '');
        sString = sString.replace(/[,;.]+$/, '');
    }
    return sString;
}
exports.cleanseString = cleanseString;
function cleanseStringLeaveDots(sString) {
    var len = 0;
    while (len !== sString.length) {
        len = sString.length;
        sString = sString.replace(/\s+/g, ' ');
        sString = sString.replace(/^\s+/, '');
        sString = sString.replace(/\s+$/, '');
        sString = sString.replace(/^[,;!?]+/, '');
        sString = sString.replace(/[,;!?]+$/, '');
    }
    return sString;
}
exports.cleanseStringLeaveDots = cleanseStringLeaveDots;
function cleanseQuotedString(sString) {
    var len = 0;
    while (len !== sString.length) {
        len = sString.length;
        sString = sString.replace(/\s\s+/g, ' ');
        sString = sString.replace(/\s+/g, ' ');
        sString = sString.replace(/^\s+/, '');
        sString = sString.replace(/\s+$/, '');
        sString = sString.replace(/^[,;.]+/, '');
        sString = sString.replace(/[,;.]+$/, '');
    }
    return sString;
}
exports.cleanseQuotedString = cleanseQuotedString;
const regexpRemoveDouble = new RegExp(/^\"(\".*\")\"$/);
const striptail = new RegExp(/^\"([^\"]+)"$/);
function trimQuoted(sString) {
    var skipUntil = 0;
    var stripped = sString;
    var m = regexpRemoveDouble.exec(sString);
    while (m) {
        stripped = m[1];
        m = regexpRemoveDouble.exec(stripped);
    }
    debuglog("stripped " + stripped);
    m = striptail.exec(stripped);
    if (m) {
        return m[1];
    }
    return cleanseString(sString);
}
exports.trimQuoted = trimQuoted;
function trimQuotedSpaced(sString) {
    var skipUntil = 0;
    sString = sString.replace(/^"\s+/g, '"');
    sString = sString.replace(/\s+\"$/g, '"');
    return sString;
}
exports.trimQuotedSpaced = trimQuotedSpaced;
function recombineQuoted(aArr) {
    var skipUntil = 0;
    aArr = aArr.map(function (s, index) {
        if (index < skipUntil) {
            debuglog("skipping >" + s + "<");
            return undefined;
        }
        if (/^"/.exec(s)) {
            var i = index;
            while (i < aArr.length && (!/"$/.exec(aArr[i]) || (index === i && s === '"'))) {
                i = i + 1;
            }
            if (i === aArr.length) {
                debuglog("Unterminated quoted string");
                return s;
            }
            else {
                skipUntil = i + 1;
                var res = aArr.slice(index, i + 1).join(" ");
            }
            return res;
        }
        return s;
    }).filter(function (s) {
        return s !== undefined;
    }).map(function (s) {
        return trimQuotedSpaced(s);
    });
    return aArr;
}
exports.recombineQuoted = recombineQuoted;
function isQuoted(sString) {
    return !!/^".*"$/.exec(sString);
}
exports.isQuoted = isQuoted;
function countSpaces(sString) {
    var r = 0;
    for (var i = 0; i < sString.length; ++i) {
        if (sString.charAt(i) === ' ') {
            r = r + 1;
        }
    }
    return r;
}
exports.countSpaces = countSpaces;
var Quotes = /^"([^"]+)"/;
function swallowQuote(str, i) {
    var m = Quotes.exec(str.substring(i));
    if (!m) {
        return { token: undefined,
            nextpos: i
        };
    }
    return {
        token: cleanseStringLeaveDots(m[1]),
        nextpos: (i + m[0].length)
    };
}
exports.swallowQuote = swallowQuote;
var Word2 = /^([.]?([-#A-Z_a-z0-9\/\\\%\$&]([\'.][-#A-Z_a-z0-9\/\\\%\$&])*)+)/;
var Word = /^(([^.,;\'\"]|(\.[^ ,;\'\"]))([^. ,;?!\"']|(\.[^ ,;?!\"'])|(\'[^. ,;?!\"\'])*)+)/;
function swallowWord(str, i) {
    var m = Word.exec(str.substring(i));
    if (!m) {
        return { token: undefined,
            nextpos: i
        };
    }
    return {
        token: m[1],
        nextpos: (i + m[0].length)
    };
}
exports.swallowWord = swallowWord;
function pushToken(res, token) {
    res.tokens.push(token);
    res.fusable[res.tokens.length] = true;
}
/**
 * Returns true iff tokenized represents multiple words, which
 * can potenially be added together;
 */
function isCombinableSplit(tokenized) {
    if (tokenized.tokens.length <= 1) {
        return false;
    }
    for (var i = 1; i < tokenized.tokens.length; ++i) {
        if (!tokenized.fusable[i]) {
            return false;
        }
    }
    return true;
}
exports.isCombinableSplit = isCombinableSplit;
/**
 * return true iff  range @ index is a suitable combinable overlap
 *
 * (typically in the parsed real string)
 * return the targetindex or -1 if impossible
 */
function isCombinableRangeReturnIndex(range, fusable, index) {
    var start = index + range.low;
    var end = index + range.high;
    // example range = -1, 0             index = 1  => start = 0, end = 1, test fusable[1]
    for (var i = start; i < end; ++i) {
        if (!fusable[i + 1]) {
            return -1;
        }
    }
    return start;
}
exports.isCombinableRangeReturnIndex = isCombinableRangeReturnIndex;
function combineTokens(range, index, tokens) {
    var start = index + range.low;
    var end = index + range.high;
    var res = [];
    for (var i = start; i <= end; ++i) {
        res.push(tokens[i]);
    }
    return res.join(" ");
}
exports.combineTokens = combineTokens;
/**
 *
 * Note: this tokenizer recognized .gitigore or .a.b.c as one token
 * trailing . is stripped!
 *@param {string} sString , e.g. "a,b c;d O'Hara and "murph'ys"
 *@return {Array<String>} broken down array, e.g.
 * [["a b c"], ["a", "b c"], ["a b", "c"], ....["a", "b", "c"]]
 */
function tokenizeString(sString, spacesLimit) {
    var res = {
        tokens: [],
        fusable: [false]
    };
    var i = 0;
    var seenSep = false;
    while (i < sString.length) {
        switch (sString.charAt(i)) {
            case '"':
                var { token, nextpos } = swallowQuote(sString, i);
                if (nextpos === i) {
                    // unterminated quote, treat like separator
                    res.fusable[res.tokens.length] = false;
                    seenSep = true;
                    ++i;
                }
                else if (token === "") {
                    res.fusable[res.tokens.length] = false;
                    seenSep = true;
                    i = nextpos;
                }
                else {
                    res.fusable[res.tokens.length] = false;
                    pushToken(res, token);
                    res.fusable[res.tokens.length] = false;
                    i = nextpos;
                }
                break;
            case '\t':
            case '\n':
            case '\r':
            case ' ':
                i++;
                break;
            case ':':
            case ',':
            case '?':
            case '!':
            case ';':
                res.fusable[res.tokens.length] = false;
                seenSep = true;
                ++i;
                break;
            case '.':
            default:
                var { token, nextpos } = swallowWord(sString, i);
                if (token) {
                    pushToken(res, token);
                    i = nextpos;
                }
                else {
                    res.fusable[res.tokens.length] = false;
                    i++;
                }
                break;
        }
    }
    res.fusable[res.tokens.length] = false;
    return res;
}
exports.tokenizeString = tokenizeString;
function makeMatchPattern(str) {
    var tokens = tokenizeString(str);
    var bestlen = 0;
    if (!isCombinableSplit(tokens)) {
        return undefined;
    }
    var best = {
        longestToken: "",
        span: { low: 0, high: 0 }
    };
    if (tokens.tokens.length > 1) {
        tokens.tokens.forEach(function (token, index) {
            var len = token.length;
            if (len > bestlen) {
                bestlen = len;
                best.longestToken = token;
                best.span.low = -index;
            }
        });
        best.span.high = tokens.tokens.length + best.span.low - 1;
        return best;
    }
    return undefined;
}
exports.makeMatchPattern = makeMatchPattern;
/**
 *@param {string} sString , e.g. "a b c"
 *@return {Array<Array<String>>} broken down array, e.g.
 *[["a b c"], ["a", "b c"], ["a b", "c"], ....["a", "b", "c"]]
 */
function breakdownString(sString, spacesLimit) {
    var rString = cleanseString(sString);
    if (spacesLimit === undefined) {
        spacesLimit = -1;
    }
    var u = rString.split(" ");
    u = recombineQuoted(u);
    var k = 0;
    if (u.length === 0) {
        return [[]];
    }
    var w = [[u[0]]];
    while (k < u.length - 1) {
        k = k + 1;
        var r1 = w.map(function (entry) {
            //  debuglog(debuglog.enabled ? JSON.stringify(entry): "-");
            var entry = entry.slice(0);
            //  debuglog(debuglog.enabled ? JSON.stringify(entry): "-");
            var preventry = entry[entry.length - 1];
            // do not combine quoted strings!
            if (preventry === null) {
                /* do nothing */ //return entry;
            }
            else if (isQuoted(u[k]) || isQuoted(preventry)) {
                entry[entry.length - 1] = null;
            }
            else {
                var combined = preventry + " " + u[k];
                if (spacesLimit > 0 && countSpaces(combined) > spacesLimit) {
                    combined = null;
                }
                entry[entry.length - 1] = combined;
            }
            return entry;
        });
        var r2 = w.map(function (entry) {
            //   debuglog(debuglog.enabled ? ("2 >" + JSON.stringify(entry)) : "-");
            var entry = entry.slice(0);
            entry.push(u[k]);
            return entry;
        });
        //debuglog(JSON.stringify(r1));
        //debuglog(JSON.stringify(r2));
        w = r1.concat(r2);
    }
    w = w.filter(function (oMap) {
        return oMap.every(function (sWord) {
            return sWord !== null;
        });
    });
    return w.map(function (oMap) {
        return oMap.map(function (sWord) {
            return trimQuoted(sWord);
        });
    });
}
exports.breakdownString = breakdownString;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtkb3duLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21hdGNoL2JyZWFrZG93bi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBRUgsK0JBQStCO0FBQy9CLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtBQU1uQyxTQUFnQixhQUFhLENBQUMsT0FBZTtJQUN6QyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDWixPQUFPLEdBQUcsS0FBSyxPQUFPLENBQUMsTUFBTSxFQUFFO1FBQzNCLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ3JCLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdEMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN6QyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDNUM7SUFDRCxPQUFPLE9BQU8sQ0FBQTtBQUNsQixDQUFDO0FBWEQsc0NBV0M7QUFFRCxTQUFnQixzQkFBc0IsQ0FBQyxPQUFlO0lBQ2xELElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztJQUNaLE9BQU8sR0FBRyxLQUFLLE9BQU8sQ0FBQyxNQUFNLEVBQUU7UUFDM0IsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDckIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sR0FBRyxPQUFPLENBQUMs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
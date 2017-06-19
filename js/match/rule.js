"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oKeyOrder = ["systemObjectCategory", "systemId", "systemObjectId"];
function compareMRuleFull(a, b) {
    var r = a.category.localeCompare(b.category);
    if (r) {
        return r;
    }
    r = a.type - b.type;
    if (r) {
        return r;
    }
    if (a.matchedString && b.matchedString) {
        r = a.matchedString.localeCompare(b.matchedString);
        if (r) {
            return r;
        }
    }
    if (a.word && b.word) {
        var r = a.word.localeCompare(b.word);
        if (r) {
            return r;
        }
    }
    r = (a._ranking || 1.0) - (b._ranking || 1.0);
    if (r) {
        return r;
    }
    if (a.exactOnly && !b.exactOnly) {
        return -1;
    }
    if (b.exactOnly && !a.exactOnly) {
        return +1;
    }
    return 0;
}
exports.compareMRuleFull = compareMRuleFull;
function cmpMRule(a, b) {
    var r = a.category.localeCompare(b.category);
    if (r) {
        return r;
    }
    r = a.type - b.type;
    if (r) {
        return r;
    }
    if (a.matchedString && b.matchedString) {
        r = a.matchedString.localeCompare(b.matchedString);
        if (r) {
            return r;
        }
    }
    if (a.word && b.word) {
        r = a.word.localeCompare(b.word);
        if (r) {
            return r;
        }
    }
    if (typeof a._ranking === "number" && typeof b._ranking === "number") {
        r = (a._ranking || 1.0) - (b._ranking || 1.0);
        if (r) {
            return r;
        }
    }
    r = a.wordType.localeCompare(b.wordType);
    if (r) {
        return r;
    }
    r = a.bitindex - b.bitindex;
    if (r) {
        return r;
    }
    if (a.range && b.range) {
        r = a.range.rule.word.localeCompare(b.range.rule.word);
        if (r) {
            return r;
        }
        r = a.range.low - b.range.low;
        if (r) {
            return r;
        }
    }
    if (a.range && !b.range) {
        return -1;
    }
    if (!a.range && b.range) {
        return +1;
    }
    return 0;
}
exports.cmpMRule = cmpMRule;

//# sourceMappingURL=rule.js.map

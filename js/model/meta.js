"use strict";
/**
 * Functionality managing the match models
 *
 * @file
 */
exports.__esModule = true;
//import * as intf from 'constants';
var debug = require("debug");
var debuglog = debug('meta');
/**
 * the model path, may be controlled via environment variable
 */
var modelPath = process.env["ABOT_MODELPATH"] || "testmodel";
var separator = " -:- ";
var validTypes = ["relation", "category", "domain"];
var AMeta = /** @class */ (function () {
    function AMeta(type, name) {
        if (validTypes.indexOf(type) < 0) {
            throw new Error("Illegal Type " + type);
        }
        this.name = name;
        this.type = type;
    }
    AMeta.prototype.toName = function () {
        return this.name;
    };
    AMeta.prototype.toFullString = function () {
        return this.type + separator + this.name;
    };
    AMeta.prototype.toType = function () {
        return this.type;
    };
    return AMeta;
}());
exports.AMeta = AMeta;
function getStringArray(arr) {
    return arr.map(function (oMeta) {
        return oMeta.toName();
    });
}
exports.getStringArray = getStringArray;
exports.RELATION_hasCategory = "hasCategory";
exports.RELATION_isCategoryOf = "isCategoryOf";
function parseAMeta(a) {
    var r = a.split(separator);
    if (!r || r.length !== 2) {
        throw new Error("cannot parse " + a + " as Meta");
    }
    switch (r[0]) {
        case "category":
            return getMetaFactory().Category(r[1]);
        case "relation":
            return getMetaFactory().Relation(r[1]);
        case "domain":
            return getMetaFactory().Domain(r[1]);
        default:
            throw new Error("unknown meta type" + r[0]);
    }
}
function getMetaFactory() {
    return {
        Domain: function (a) {
            return new AMeta("domain", a);
        },
        Category: function (a) {
            return new AMeta("category", a);
        },
        Relation: function (a) {
            return new AMeta("relation", a);
        },
        parseIMeta: parseAMeta
    };
}
exports.getMetaFactory = getMetaFactory;

//# sourceMappingURL=meta.js.map

//# sourceMappingURL=meta.js.map

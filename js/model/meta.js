/**
 * Functionality managing the match models
 *
 * @file
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//import * as intf from 'constants';
const debug = require("debug");
var debuglog = debug('meta');
/**
 * the model path, may be controlled via environment variable
 */
var modelPath = process.env["ABOT_MODELPATH"] || "testmodel";
const separator = " -:- ";
const validTypes = ["relation", "category", "domain"];
class AMeta {
    constructor(type, name) {
        if (validTypes.indexOf(type) < 0) {
            throw new Error("Illegal Type " + type);
        }
        this.name = name;
        this.type = type;
    }
    toName() {
        return this.name;
    }
    toFullString() {
        return this.type + separator + this.name;
    }
    toType() {
        return this.type;
    }
}
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

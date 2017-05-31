"use strict";
/**
 * Functionality to map the "flat" categories model to a nested document
 *
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
//import * as intf from 'constants';
const debug = require("debugf");
var debuglog = debug('mongomap');
const process = require("process");
const _ = require("lodash");
/**
 * the model path, may be controlled via environment variable
 */
var envModelPath = process.env["ABOT_MODELPATH"] || "node_modules/abot_testmodel/testmodel";
function traverseExecutingContext(obj, context) {
    _.forIn(obj, function (val, key) {
        // console.log(key + " -> " + val + " ");
        context.visit(obj, key, val);
        if (_.isArray(val)) {
            context.enterArray(key, val);
            val.forEach(function (el) {
                if (_.isObject(el)) {
                    traverseExecutingContext(el, context);
                }
            });
            context.leaveArray(key, val);
            // console.log('leaving array key' + key  + " " + JSON.stringify(val));
        }
        else if (_.isObject(val)) {
            //  if( _.isArray(val) && _.isObject(val)) {
            //&&      console.log('ABCXASDFS');
            //  };
            //   console.log('is also object' + JSON.stringify(val));
            context.enterObject(key, val);
            traverseExecutingContext(val, context);
            context.leaveObject(key, val);
        }
    });
}
function collectCategories(eSchemaProps) {
    var oContext = {
        res: {},
        plainPath: [],
        currentPath: [],
        enterObject: function (key, val) {
            this.currentPath.push(key);
            this.plainPath.push(key);
        },
        visit: function (obj, key, val) {
            if (key === '_m_category') {
                this.res[val] = {
                    paths: this.currentPath.slice(),
                    fullpath: this.plainPath.join('.')
                };
            }
        },
        leaveObject: function (key, val) {
            this.currentPath.pop();
            this.plainPath.pop();
        },
        enterArray: function (key, val) {
            this.enterObject(key, val);
            this.currentPath.push('[]');
        },
        leaveArray: function (key, val) {
            this.leaveObject(key, val);
            this.currentPath.pop();
        }
    };
    traverseExecutingContext(eSchemaProps, oContext);
    return oContext.res;
}
exports.collectCategories = collectCategories;
/**
 * Given a record and a paths expression, return
 * the value (string or array) which represents this path
 * Note that a trailing array is not expanded,
 * @param rec
 * @param paths
 */
function getMemberByPath(rec, paths) {
    var root = rec;
    var res = paths.reduce((prev, segment, index) => {
        debuglog(() => `at index ${index} segment ${segment} on ${JSON.stringify(prev)}`);
        if (prev === undefined || prev === null) {
            return undefined;
        }
        if (segment !== "[]") {
            return prev[segment];
        }
        else {
            if (index === (paths.length - 1)) {
                return prev;
            }
            if (_.isArray(prev)) {
                if (prev.length > 1) {
                    throw Error('cannot flatten more than one record ');
                }
                return prev[0];
            }
            else {
                return prev;
            }
        }
    }, rec);
    debuglog(() => ` herer result ` + res);
    return res;
}
exports.getMemberByPath = getMemberByPath;
function constructPath(paths, len) {
    return paths.slice(0, len).filter(seg => seg !== '[]').join('.');
}
function unwindsForNonterminalArrays(mongoMap) {
    var paths = Object.keys(mongoMap).map(key => mongoMap[key].paths);
    var res = [];
    var seenAccess = {};
    return paths.reduce((prev, path) => {
        var prefix = '';
        return path.reduce((prev, segment, index) => {
            if (path.length - 1 !== index) {
                // last segment never of interest, even if []
                if (segment === '[]') {
                    var expandPath = '$' + constructPath(path, index);
                    if (!seenAccess[expandPath]) {
                        seenAccess[expandPath] = true;
                        prev.push({
                            $unwind: {
                                path: expandPath,
                                preserveNullAndEmptyArrays: true
                            }
                        });
                    }
                }
                return prev;
            }
            return prev;
        }, prev);
    }, res);
}
exports.unwindsForNonterminalArrays = unwindsForNonterminalArrays;
function makeMongoMap(oDoc, eSchema) {
    var oMongoMap = {};
    debuglog(() => 'creating mongomap for ' + JSON.stringify(eSchema.modelname, undefined, 2) + ' and ' + oDoc.modelname);
    debuglog(() => 'creating mongomap for doc ' + JSON.stringify(oDoc, undefined, 2));
    debuglog(() => 'colleting from eSchema.props' + JSON.stringify(eSchema.props, undefined, 2));
    var res = collectCategories(eSchema.props);
    oDoc._categories.forEach(cat => {
        // cross check
        if (!res[cat.category]) {
            console.log('here present keys' + Object.keys(res).sort().join("; "));
            console.log(`category ${cat.category} is not in eSchema`); // + JSON.stringify(eSchema,undefined,2)
            console.log(`document has ` + oDoc._categories.map(cat => cat.category).join('; '));
            //process.exit(-1);
            console.log(`category "${cat.category}" is not in eSchema for ${oDoc.modelname} + ${eSchema.modelname} : `
                + "=====Schema:\n" + JSON.stringify(eSchema, undefined, 2).substring(0, 400)
                + "\n========oDoc: \n" + JSON.stringify(oDoc, undefined, 2).substring(0, 400));
            process.exit(-1);
            throw new Error(`category ${cat.category} is not in eSchema for ${oDoc.modelname} + ${eSchema.modelname} : `
                + JSON.stringify(eSchema, undefined, 2).substring(0, 200)
                + "\n=========== " + JSON.stringify(oDoc, undefined, 2).substring(0, 400));
        }
    });
    return res;
}
exports.makeMongoMap = makeMongoMap;

//# sourceMappingURL=mongomap.js.map

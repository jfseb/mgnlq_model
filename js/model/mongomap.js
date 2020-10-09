"use strict";
/**
 * Functionality to map the "flat" categories model to a nested document
 *
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeMongoMap = exports.unwindsForNonterminalArrays = exports.getShortProjectedName = exports.isNonObjectPath = exports.makeMongoNameLC = exports.getFirstSegment = exports.makeCategoryPath = exports.getMemberByPath = exports.collectCategories = void 0;
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
/**
 * return a category
 * @param mongoMap
 * @param cat a category
 * @return the constructed path, without any preceding $
 */
function makeCategoryPath(mongoMap, category) {
    return mongoMap[category].fullpath;
}
exports.makeCategoryPath = makeCategoryPath;
/**
 * Given a segment path, return the
 * @param paths
 */
function getFirstSegment(paths) {
    if (paths[0] === '[]' || paths.length === 0) {
        throw new Error('did not expect a full array');
    }
    return paths[0];
}
exports.getFirstSegment = getFirstSegment;
function makeMongoNameLC(s) {
    return s.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}
exports.makeMongoNameLC = makeMongoNameLC;
function isNonObjectPath(mongoMap, category) {
    return mongoMap[category].fullpath.indexOf(".") < 0;
}
exports.isNonObjectPath = isNonObjectPath;
function getShortProjectedName(mongoMap, category) {
    if (isNonObjectPath(mongoMap, category)) {
        return mongoMap[category].fullpath;
    }
    return makeMongoNameLC(category);
}
exports.getShortProjectedName = getShortProjectedName;
getShortProjectedName;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ29tYXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWwvbW9uZ29tYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7OztBQUdILG9DQUFvQztBQUNwQyxnQ0FBZ0M7QUFFaEMsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBYWpDLG1DQUFtQztBQUNuQyw0QkFBNEI7QUFHNUI7O0dBRUc7QUFDSCxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksdUNBQXVDLENBQUM7QUFHNUYsU0FBUyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsT0FBTztJQUMxQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxVQUFVLEdBQUcsRUFBRSxHQUFHO1FBQzNCLHlDQUF5QztRQUN6QyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2hCLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBUyxFQUFFO2dCQUNuQixJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ2hCLHdCQUF3QixDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztpQkFDekM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLHVFQUF1RTtTQUN6RTthQUNJLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN4Qiw0Q0FBNEM7WUFDNUMsbUNBQW1DO1lBQ25DLE1BQU07WUFDUCx5REFBeUQ7WUFDdEQsT0FB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
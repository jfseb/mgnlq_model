/**
 * Functionality managing the match models
 *
 * @file
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//import * as intf from 'constants';
const debug = require("debugf");
var debuglog = debug('schemaload');
//import * as InputFilterRules from '../match/rule';
//import * as Tools from '../match/tools';
const fs = require("fs");
const FUtils = require("../model/model");
//import * as CircularSer from 'abot_utils';
//import * as Distance from 'abot_stringdist';
const process = require("process");
const _ = require("lodash");
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
/**
 * WATCH out, this instruments mongoose!
 */
require('mongoose-schema-jsonschema')(mongoose);
/**
 * the model path, may be controlled via environment variable
 */
var envModelPath = process.env["ABOT_MODELPATH"] || "node_modules/abot_testmodel/testmodel";
function cmpTools(a, b) {
    return a.name.localeCompare(b.name);
}
exports.cmpTools = cmpTools;
const ExtendedSchema_props = {
    "modelname": {
        "type": String,
        "trim": true,
        "required": true
    },
    "domain": {
        "type": String,
        "trim": true,
        "required": true
    },
    "mongoosemodelname": {
        "type": String,
        "trim": true,
        "required": true
    },
    "collectionname": {
        "type": String,
        "trim": true,
        "required": true
    },
    "props": {},
    "index": {}
};
const ExtendedSchema_index = {
    "modelname": "text"
};
// load the models
function loadModelNames(modelPath) {
    modelPath = modelPath || envModelPath;
    var mdls = FUtils.readFileAsJSON('./' + modelPath + '/models.json');
    mdls.forEach(name => {
        if (name !== makeMongoCollectionName(name)) {
            throw new Error('bad modelname, must terminate with s and be lowercase');
        }
    });
    return mdls;
}
exports.loadModelNames = loadModelNames;
;
;
function mapType(val) {
    if (val === "String") {
        return String;
    }
    if (val === "Boolean") {
        return Boolean;
    }
    if (val === "Number") {
        return Number;
    }
    throw new Error(" illegal type " + val + " expected String, Boolean, Number, ...");
}
exports.mapType = mapType;
function replaceIfTypeDeleteM(obj, val, key) {
    if (key.substr(0, 3) === "_m_") {
        delete obj[key];
        return;
    }
    ;
    if (key === "type" && typeof val === "string") {
        var r = mapType(val);
        obj[key] = r;
    }
}
exports.replaceIfTypeDeleteM = replaceIfTypeDeleteM;
function traverseExecuting(obj, fn) {
    _.forIn(obj, function (val, key) {
        //    console.log(val + " -> " + key + " ");
        fn(obj, val, key);
        if (_.isArray(val)) {
            val.forEach(function (el) {
                if (_.isObject(el)) {
                    traverseExecuting(el, fn);
                }
            });
        }
        if (_.isObject(val)) {
            traverseExecuting(obj[key], fn);
        }
    });
}
function traverseReplacingType(obj) {
    return traverseExecuting(obj, replaceIfTypeDeleteM);
    /*
    _.forIn(obj, function (val, key) {
    //    console.log(val + " -> " + key + " ");
        replaceIfTypeDeleteM(obj,val,key);
        if (_.isArray(val)) {
            val.forEach(function(el) {
                if (_.isObject(el)) {
                    traverseReplacingType(el);
                }
            });
        }
        if (_.isObject(val)) {
            traverseReplacingType(obj[key]);
        }
    });
    */
}
function typeProps(a) {
    var aCloned = _.cloneDeep(a);
    //console.log(JSON.stringify(aCloned, undefined, 2));
    traverseReplacingType(aCloned);
    return aCloned;
}
exports.typeProps = typeProps;
function makeMongooseSchema(extSchema, mongo) {
    var typedProps = typeProps(extSchema.props);
    var mongo = mongo || mongoose;
    var schema = mongo.Schema(extSchema.props); //{ props : extSchema.props, index : extSchema.index  });
    schema.index(extSchema.index);
    return schema;
}
exports.makeMongooseSchema = makeMongooseSchema;
function loadExtendedMongooseSchema(modelPath, modelName) {
    var schemaSer = FUtils.readFileAsJSON('./' + modelPath + '/' + modelName + '.model.mongooseschema.json');
    schemaSer.modelName = modelName;
    return schemaSer;
}
exports.loadExtendedMongooseSchema = loadExtendedMongooseSchema;
function loadModelDoc(modelPath, modelName) {
    var docSer = FUtils.readFileAsJSON('./' + modelPath + '/' + modelName + '.model.doc.json');
    docSer.modelname = modelName;
    return docSer;
}
exports.loadModelDoc = loadModelDoc;
var aPromise = global.Promise;
;
function augmentMongooseSchema(modelDoc, schemaRaw) {
    debuglog(() => 'augmenting for ' + modelDoc.modelname);
    var res = { domain: modelDoc.domain,
        modelname: modelDoc.modelname,
        mongoosemodelname: makeMongooseModelName(modelDoc.modelname),
        collectionname: makeMongoCollectionName(modelDoc.modelname)
    };
    return Object.assign(res, schemaRaw);
}
exports.augmentMongooseSchema = augmentMongooseSchema;
/**
 * return a modelname without a traling s
 * @param collectionName
 */
function makeMongooseModelName(collectionName) {
    if (collectionName !== collectionName.toLowerCase()) {
        throw new Error('expect lowercase, was ' + collectionName);
    }
    if (collectionName.charAt(collectionName.length - 1) === 's') {
        return collectionName.substring(0, collectionName.length - 1);
    }
    throw new Error('expected name with trailing s');
}
exports.makeMongooseModelName = makeMongooseModelName;
/**
 * returns a mongoose collection name
 * @param modelName
 */
function makeMongoCollectionName(modelName) {
    if (modelName !== modelName.toLowerCase()) {
        throw new Error('expect lowercase, was ' + modelName);
    }
    if (modelName.charAt(modelName.length - 1) !== 's') {
        return modelName + 's';
    }
    return modelName;
}
exports.makeMongoCollectionName = makeMongoCollectionName;
function getExtendedSchema(mongoose) {
    var extendSchema = mongoose.Schema(ExtendedSchema_props);
    //console.log("now extended schema");
    extendSchema.index(ExtendedSchema_index);
    return extendSchema;
    //console.log('creating model 2');
}
exports.getExtendedSchema = getExtendedSchema;
function getExtendedSchemaModel(mongoose) {
    var mgModelName = makeMongooseModelName(exports.MongoNLQ.COLL_EXTENDEDSCHEMAS);
    if (mongoose.modelNames().indexOf(mgModelName) >= 0) {
        return mongoose.model(mgModelName);
    }
    var extendSchema = getExtendedSchema(mongoose);
    var modelES = mongoose.model(makeMongooseModelName(exports.MongoNLQ.COLL_EXTENDEDSCHEMAS), extendSchema);
    instrumentModel(modelES);
    return modelES;
}
exports.getExtendedSchemaModel = getExtendedSchemaModel;
function instrumentModel(model) {
    return model;
    /*
    if(process.env.MONGO_RECORD && process.env.MONGO_REPLAY) {
        console.log('set only one of MONGO_RECORD MONGO_REPLAY');
        process.exit(-1);
    }
    if (process.env.MONGO_RECORD) {
        instrumentModelRecord(model);
    } else if (process.env.MONGO_REPLAY) {
        // todo
        instrumentModelReplay(model);
    }
    return model;
    */
}
exports.instrumentModel = instrumentModel;
var crypto = require('crypto');
function recordOp(op, name, query, res) {
    var md5sum = crypto.createHash('md5');
    debuglog('here the name ' + name);
    md5sum.update(op + name + JSON.stringify(query));
    var digest = md5sum.digest('hex');
    fs.writeFileSync('mgrecord/data/' + digest, JSON.stringify(res, undefined, 2));
    var known = {};
    try {
        known = FUtils.readFileAsJSON('mgrecord/queries.json');
    }
    catch (ex) {
    }
    known[digest] = { op: op,
        name: name,
        digest: digest,
        query: query,
        res: res };
    fs.writeFileSync('mgrecord/queries.json', JSON.stringify(known, undefined, 2));
}
exports.recordOp = recordOp;
function retrieveOp(op, name, query) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(op + name + JSON.stringify(query));
    var digest = md5sum.digest('hex');
    var res = FUtils.readFileAsJSON('mgrecord/data/' + digest);
    return res;
}
exports.retrieveOp = retrieveOp;
function instrumentModelRecord(modelDoc) {
    console.log('instrumenting model ' + modelDoc.modelName);
    var oFind = modelDoc.find;
    modelDoc.find = function () {
        debuglog('someone is calling find with ' + modelDoc.modelName + JSON.stringify(arguments, undefined, 2));
        var res = oFind.apply(modelDoc, arguments);
        if (arguments.length !== 1) {
            throw Error('expected one arguments in find, was ' + arguments.length);
        }
        var query = arguments[0];
        res.lean().exec().then((a) => {
            //console.log("here result1 + " + JSON.stringify(a, undefined,2) );
            recordOp("find", modelDoc.modelName, query, a);
        });
        return res;
    };
    var oDistinct = modelDoc.distinct;
    modelDoc.distinct = function () {
        debuglog('someone is calling distinct with' + JSON.stringify(arguments, undefined, 2));
        var res = oDistinct.apply(modelDoc, arguments);
        if (arguments.length !== 1) {
            throw Error('expected on arguments');
        }
        var query = arguments[0];
        res.then((a) => {
            // console.log("here result1 + " + JSON.stringify(a, undefined,2) );
            recordOp("distinct", modelDoc.modelName, query, a);
        });
        return res;
    };
    var oAggregate = modelDoc.aggregate;
    modelDoc.aggregate = function () {
        debuglog(() => 'someone is calling aggregate with' + JSON.stringify(arguments, undefined, 2));
        var query = Array.prototype.slice.call(arguments);
        var res = oAggregate.apply(modelDoc, arguments);
        res.then((a) => {
            debuglog(() => "here result1 + " + JSON.stringify(a, undefined, 2));
            recordOp("aggregate", modelDoc.modelName, query, a);
        });
        return res;
    };
}
exports.instrumentModelRecord = instrumentModelRecord;
function instrumentModelReplay(modelDoc) {
    debuglog('instrumenting model ' + modelDoc.modelName);
    var oFind = modelDoc.find;
    modelDoc.find = function () {
        debuglog(() => 'someone is replaying find with' + JSON.stringify(arguments, undefined, 2));
        var query = arguments[0];
        var res = retrieveOp("find", modelDoc.modelName, query);
        debuglog(() => 'returning res ' + JSON.stringify(res) + ' for query find' + query);
        return {
            lean: function () {
                return {
                    exec: function () {
                        return new Promise(function (resolve, reject) {
                            setTimeout(function () { resolve(res); }, 0);
                        });
                    }
                };
            }
        };
    };
    var oDistinct = modelDoc.distinct;
    modelDoc.distinct = function () {
        debuglog('someone is replaying distinct with' + JSON.stringify(arguments, undefined, 2));
        var query = arguments[0];
        var res = retrieveOp("distinct", modelDoc.modelName, query);
        debuglog('returning res ' + JSON.stringify(res) + ' for query find' + query);
        return new Promise(function (resolve, reject) {
            setTimeout(function () { resolve(res); }, 0);
        });
    };
    var oAggregate = modelDoc.aggregate;
    modelDoc.aggregate = function () {
        debuglog('someone is replaying aggregate with' + JSON.stringify(arguments, undefined, 2));
        var query = Array.prototype.slice.call(arguments);
        var res = retrieveOp("aggregate", modelDoc.modelName, query);
        var p = new Promise(function (resolve, reject) {
            setTimeout(function () { resolve(res); }, 0);
        });
        p.exec = function () {
            return p;
        };
        return p;
    };
}
exports.instrumentModelReplay = instrumentModelReplay;
function getModelDocModel(mongoose) {
    var metaDoc = FUtils.readFileAsJSON('./resources/meta/metamodels.model.doc.json');
    metaDoc.modelname = exports.MongoNLQ.MODELNAME_METAMODELS;
    var schemaSer2 = loadExtendedMongooseSchema('resources/meta', exports.MongoNLQ.MODELNAME_METAMODELS);
    var schemaSer = augmentMongooseSchema(metaDoc, schemaSer2);
    var schema = makeMongooseSchema(schemaSer, mongoose);
    var mongooseModelName = makeMongooseModelName(exports.MongoNLQ.COLL_METAMODELS);
    if (mongoose.modelNames().indexOf(mongooseModelName) >= 0) {
        return mongoose.model(mongooseModelName);
    }
    var modelDoc = mongoose.model(makeMongooseModelName(exports.MongoNLQ.COLL_METAMODELS), schema);
    instrumentModel(modelDoc);
    var oFind = modelDoc.find;
    return modelDoc;
}
exports.getModelDocModel = getModelDocModel;
function upsertMetaModel(mongoose) {
    var metaDoc = FUtils.readFileAsJSON('./resources/meta/metamodels.model.doc.json');
    debuglog(() => "here metaDoc to insert as loaded" + JSON.stringify(metaDoc));
    metaDoc.modelname = exports.MongoNLQ.MODELNAME_METAMODELS;
    var schemaSer2 = loadExtendedMongooseSchema('resources/meta', exports.MongoNLQ.MODELNAME_METAMODELS);
    var schemaSer = augmentMongooseSchema(metaDoc, schemaSer2);
    debuglog(() => 'here schemaser' + JSON.stringify(schemaSer, undefined, 2));
    mongoose.Promise = global.Promise;
    var schema = makeMongooseSchema(schemaSer, mongoose);
    //console.log("make schema 1");
    //var extendSchema = mongoose.Schema(ExtendedSchema_props);
    ///console.log("now extended schema");
    //extendSchema.index(ExtendedSchema_index);
    //console.log("now document ..." + JSON.stringify(extendSchema,undefined,2));
    var modelDoc = mongoose.model(makeMongooseModelName(exports.MongoNLQ.COLL_METAMODELS), schema);
    instrumentModel(modelDoc);
    //console.log('creating model 2');
    var modelES = getExtendedSchemaModel(mongoose); //mongoose.model(makeMongooseModelName(MongoNLQ.COLL_EXTENDEDSCHEMAS), extendSchema);
    debuglog(() => "here metaDoc to insert" + JSON.stringify(metaDoc));
    debuglog(() => "here schemaser to insert" + JSON.stringify(schemaSer));
    return Promise.all([
        validateDocVsMongooseModel(modelDoc, metaDoc).then(() => modelDoc.findOneAndUpdate({ modelname: exports.MongoNLQ.MODELNAME_METAMODELS }, metaDoc, {
            upsert: true
        })),
        validateDocVsMongooseModel(modelES, schemaSer).then(() => modelES.findOneAndUpdate({ modelname: exports.MongoNLQ.MODELNAME_METAMODELS }, schemaSer, {
            upsert: true
        }))
    ]); //.then( () => process.exit(-1));
}
exports.upsertMetaModel = upsertMetaModel;
function createDBWithModels(mongoose, modelPath) {
    return upsertMetaModel(mongoose).then(upsertModels.bind(undefined, mongoose, modelPath));
}
exports.createDBWithModels = createDBWithModels;
//export function getModelNames(model : mongoose.model, )
function removeOthers(mongoose, model, retainedNames) {
    //console.log('here collectionname' + Object.keys(model));
    //console.log('here collectionname' + model.collectionname);
    return model.aggregate({ $project: { modelname: 1 } }).then((r) => r.map(o => o.modelname)).then((modelnames) => {
        debuglog(" present models " + modelnames.length + ' ' + modelnames);
        var delta = _.difference(modelnames, retainedNames);
        debuglog(' spurious models' + delta.length + ' ' + delta);
        if (delta.length === 0) {
            return Promise.resolve(true);
        }
        return Promise.all(delta.map(modelname => model.remove({ modelname: modelname })));
    });
}
exports.removeOthers = removeOthers;
var SchemaOperators = { operators: {}, synonyms: {} };
var SchemaFillers = { fillers: [{
            type: String
        }]
};
function getOrCreateModelFillers(mongoose) {
    if (mongoose.modelNames().indexOf('filler') >= 0) {
        return mongoose.model('filler');
    }
    else {
        return instrumentModel(mongoose.model('filler', new mongoose.Schema(SchemaFillers)));
    }
}
exports.getOrCreateModelFillers = getOrCreateModelFillers;
function getOrCreateModelOperators(mongoose) {
    if (mongoose.modelNames().indexOf('operator') >= 0) {
        return mongoose.model('operator');
    }
    else {
        return instrumentModel(mongoose.model('operator', new mongoose.Schema(SchemaOperators)));
    }
}
exports.getOrCreateModelOperators = getOrCreateModelOperators;
function getFillersFromDB(mongoose) {
    var fillerModel = getOrCreateModelFillers(mongoose);
    return fillerModel.find({}).lean().exec().then((vals) => {
        if (vals.length !== 1) {
            throw new Error('expected exactly one operators entry ');
        }
        ;
        return vals[0];
    });
}
exports.getFillersFromDB = getFillersFromDB;
function getOperatorsFromDB(mongoose) {
    var operatorModel = getOrCreateModelOperators(mongoose);
    return operatorModel.find({}).lean().exec().then((vals) => {
        if (vals.length !== 1) {
            throw new Error('expected exactly one operators entry ');
        }
        ;
        return vals[0];
    });
}
exports.getOperatorsFromDB = getOperatorsFromDB;
function getExtendSchemaDocFromDB(mongoose, modelName) {
    var mongooseModelName = makeMongooseModelName(modelName);
    var model_ES = mongoose.model(exports.MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
    var res = model_ES.find({ modelname: modelName }).lean().exec().then((doc) => {
        debuglog(() => ` loaded Es doc ${modelName} returned ${doc.length} docus from db : `
            + doc[0].modelname + `` + doc[0].collectionname);
        debuglog(() => 'here the result' + JSON.stringify(doc));
        if (doc.length === 0) {
            throw Error('Model ' + modelName + ' is not present in ' + exports.MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
        }
        return doc[0];
    });
    //console.log('res' + typeof res);
    return res;
    //   return Promise.reject('model ' + modelName + ' cannot be found on db');
}
exports.getExtendSchemaDocFromDB = getExtendSchemaDocFromDB;
function getModelDocFromDB(mongoose, modelName) {
    var mongooseModelName = makeMongooseModelName(modelName);
    var model_ES = mongoose.model(exports.MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
    return makeModelFromDB(mongoose, exports.MongoNLQ.MODELNAME_METAMODELS).then((model) => model.find({ modelname: modelName }).lean().exec()).then((doc) => {
        debuglog(() => ' loaded Model doc ${modelName} returned ${(doc as any).length} docus from db : '
            + doc[0].modelname + ` ` + doc[0].collectionname);
        debuglog('here the result' + JSON.stringify(doc));
        if (doc.length === 0) {
            throw Error('Model ' + modelName + ' is not present in ' + exports.MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
        }
        return doc[0];
    });
    //   return Promise.reject('model ' + modelName + ' cannot be found on db');
}
exports.getModelDocFromDB = getModelDocFromDB;
function makeModelFromDB(mongoose, modelName) {
    var mongooseModelName = makeMongooseModelName(modelName);
    if (mongoose.modelNames().indexOf(mongooseModelName) >= 0) {
        return Promise.resolve(mongoose.model(mongooseModelName));
    }
    debuglog(() => 'here present modelnames: ' + mongoose.modelNames().join('\n'));
    var model_ES = mongoose.model(exports.MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
    debuglog(() => 'here modelname:' + modelName);
    var res = model_ES.find({ modelname: modelName }).lean().exec().then((doc) => {
        debuglog(() => ` loaded Model doc ${modelName} returned ${doc.length} docus from db : `
            + doc[0].modelname + ` ` + doc[0].collectionname);
        debuglog(() => 'here the result' + JSON.stringify(doc));
        if (doc.length === 0) {
            throw Error('Model ' + modelName + ' is not present in ' + exports.MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
        }
        debuglog(() => 'creating schema for ' + modelName + ' from ');
        //  + JSON.stringify(doc[0]));
        var schema = makeMongooseSchema(doc[0], mongoose);
        if (mongoose.modelNames().indexOf(mongooseModelName) >= 0) {
            return Promise.resolve(mongoose.model(mongooseModelName));
        }
        var model = mongoose.model(mongooseModelName, schema);
        instrumentModel(model);
        debuglog(() => 'returning model: ' + modelName + ` ` + typeof model);
        return Promise.resolve(model);
    });
    //console.log('res' + typeof res);
    return res;
    //   return Promise.reject('model ' + modelName + ' cannot be found on db');
}
exports.makeModelFromDB = makeModelFromDB;
function uploadFillers(mongoose, modelPath) {
    var modelFiller = getOrCreateModelFillers(mongoose);
    return modelFiller.remove({}).then(() => {
        var fillers = FUtils.readFileAsJSON('./' + modelPath + '/filler.json');
        return new modelFiller({ fillers: fillers }).save();
    });
}
exports.uploadFillers = uploadFillers;
function uploadOperators(mongoose, modelPath) {
    var modelFiller = getOrCreateModelOperators(mongoose);
    return modelFiller.remove({}).then(() => {
        var operators = FUtils.readFileAsJSON('./' + modelPath + '/operators.json');
        return new modelFiller(operators).save();
    });
}
exports.uploadOperators = uploadOperators;
function upsertModels(mongoose, modelpath) {
    var modelNames = loadModelNames(modelpath);
    var model_ES = mongoose.model(exports.MongooseNLQ.MONGOOSE_MODELNAME_EXTENDEDSCHEMAS);
    var model_Doc = mongoose.model(exports.MongooseNLQ.MONGOOSE_MODELNAME_METAMODELS);
    debuglog('here modelnames ' + modelNames);
    return removeOthers(mongoose, model_ES, [exports.MongoNLQ.MODELNAME_METAMODELS]).then(() => Promise.all(modelNames.map((modelName) => {
        debuglog('upserting  ' + modelName);
        var modelDoc = loadModelDoc(modelpath, modelName);
        var schemaSer = loadExtendedMongooseSchema(modelpath, modelName);
        var schemaFull = augmentMongooseSchema(modelDoc, schemaSer);
        debuglog(`upserting eschema ${modelName}  with modelDoc` + JSON.stringify(schemaFull));
        var p1 = model_ES.findOneAndUpdate({ modelname: modelName }, schemaFull, {
            upsert: true
        });
        debuglog(`upserting model ${modelName}  with modelDoc` + JSON.stringify(modelDoc));
        var p2 = model_Doc.findOneAndUpdate({ modelname: modelName }, modelDoc, {
            upsert: true
        });
        return Promise.all([p1, p2]);
    }))).then(() => {
        var modelNamesExtended = modelNames.slice();
        modelNamesExtended.push(exports.MongoNLQ.MODELNAME_METAMODELS);
        debuglog('removing spurious models');
        return Promise.all([
            removeOthers(mongoose, model_ES, modelNamesExtended),
            removeOthers(mongoose, model_Doc, modelNamesExtended)
        ]);
    }).then(() => {
        return Promise.all([
            uploadFillers(mongoose, modelpath),
            uploadOperators(mongoose, modelpath)
        ]);
    });
}
exports.upsertModels = upsertModels;
function hasMetaCollection(mongoose) {
    return new Promise(function (reject, resolve) {
        mongoose.connection.db.listCollections().toArray((err, names) => {
            if (err) {
                reject(err);
                return;
            }
            if (names.indexOf(exports.MongoNLQ.COLL_METAMODELS) >= 0) {
                resolve(true);
            }
            reject("domain not loaded");
        });
    });
}
exports.hasMetaCollection = hasMetaCollection;
exports.MongoNLQ = {
    MODELNAME_METAMODELS: "metamodels",
    COLL_METAMODELS: "metamodels",
    COLL_EXTENDEDSCHEMAS: "mongonlq_eschemas"
};
exports.MongooseNLQ = {
    MONGOOSE_MODELNAME_EXTENDEDSCHEMAS: makeMongooseModelName(exports.MongoNLQ.COLL_EXTENDEDSCHEMAS),
    MONGOOSE_MODELNAME_METAMODELS: makeMongooseModelName(exports.MongoNLQ.COLL_METAMODELS)
};
function getModelRecByModelName(mongoose, modelPath, modelName) {
    // do we have the meta collection in the db?
    return Promise.all([
        mongoose.connection.db[exports.MongoNLQ.COLL_METAMODELS].find({ modelName: modelName }),
        mongoose.connection.db[exports.MongoNLQ.COLL_EXTENDEDSCHEMAS].find({ modelName: modelName })
    ]).then(res => {
        var modelDoc = res[0];
        var extendedSchema = res[1];
        var schema = makeMongooseSchema(extendedSchema);
        var model = mongoose.model(modelDoc.collectionName, schema);
        return {
            collectionName: modelDoc.collectionName,
            modelDoc: modelDoc,
            schema: makeMongooseSchema(extendedSchema),
            model: model
        };
    });
}
exports.getModelRecByModelName = getModelRecByModelName;
/*
    hasMetaCollection(mongoose).then( () => {
        mongoose.connection.db.mgnlq_domains.find( {
            modelName : modelName
        }).then( doc => {
            if (doc.schema)
        });
    });
    mongoose.connection.db.listCollections().toArray((err ,names ) =>
    {
        if(names.indexOf("mgnlq_domains") >= 0) {

        }
    });
}
*/
function validateDocMongoose(mongoose, collectionname, schema, doc) {
    var DocModel;
    //console.log('schema ' + JSON.stringify(schema));
    if (mongoose.modelNames().indexOf(collectionname) >= 0) {
        DocModel = mongoose.model(collectionname);
    }
    else {
        DocModel = mongoose.model(collectionname, schema);
    }
    return validateDocVsMongooseModel(DocModel, doc);
}
exports.validateDocMongoose = validateDocMongoose;
function validateDocVsMongooseModel(model, doc) {
    return new Promise((resolve, reject) => {
        var theDoc = new model(doc);
        theDoc.validate((err) => {
            if (err) {
                //console.log(err);
                reject(err);
            }
            else {
                resolve(theDoc);
            }
        });
    });
}
exports.validateDocVsMongooseModel = validateDocVsMongooseModel;
function validateDoc(collectionname, schema, doc) {
    var jsonSchemaR = schema.jsonSchema();
    var jsonSchema = _.cloneDeep(jsonSchemaR);
    traverseExecuting(jsonSchema, function (obj, val, key) {
        if (key === 'properties' && obj.type === 'object') {
            //console.log('augmenting schema');
            obj.additionalProperties = false;
        }
    });
    //console.log(JSON.stringify(jsonSchema,undefined,2));
    var Validator = require('jsonschema').Validator;
    var v = new Validator();
    //console.log(JSON.stringify(jsonSchema,undefined,2));
    var valresult = v.validate(doc, jsonSchema);
    if (valresult.errors.length) {
        throw new Error("Schema validation failed : " + JSON.stringify(valresult.errors, undefined, 2));
    }
    return true;
}
exports.validateDoc = validateDoc;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hbG9hZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbGxvYWQvc2NoZW1hbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztHQUlHOzs7QUFFSCxvQ0FBb0M7QUFDcEMsZ0NBQWdDO0FBRWhDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUtuQyxvREFBb0Q7QUFDcEQsMENBQTBDO0FBQzFDLHlCQUF5QjtBQUV6Qix5Q0FBeUM7QUFFekMsNENBQTRDO0FBQzVDLDhDQUE4QztBQUM5QyxtQ0FBbUM7QUFDbkMsNEJBQTRCO0FBQzVCLHFDQUFxQztBQUVwQyxRQUFnQixDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBRTNDOztHQUVHO0FBQ0gsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEQ7O0dBRUc7QUFDSCxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksdUNBQXVDLENBQUM7QUFFNUYsa0JBQXlCLENBQWUsRUFBRSxDQUFlO0lBQ3ZELE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEMsQ0FBQztBQUZELDRCQUVDO0FBS0QsTUFBTSxvQkFBb0IsR0FBRztJQUN6QixXQUFXLEVBQUU7UUFDWCxNQUFNLEVBQUUsTUFBTTtRQUNkLE1BQU0sRUFBRSxJQUFJO1FBQ1osVUFBVSxFQUFHLElBQUk7S0FDbEI7SUFDRCxRQUFRLEVBQUU7UUFDUixNQUFNLEVBQUUsTUFBTTtRQUNkLE1BQU0sRUFBRSxJQUFJO1FBQ1osVUFBVSxFQUFHLElBQUk7S0FDbEI7SUFDRCxtQkFBbUIsRUFBRTtRQUNuQixNQUFNLEVBQUUsTUFBTTtRQUNkLE1BQU0sRUFBRSxJQUFJO1FBQ1osVUFBVSxFQUFHLElBQUk7S0FD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
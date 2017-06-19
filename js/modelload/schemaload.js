"use strict";
/**
 * Functionality managing the match models
 *
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
//import * as intf from 'constants';
const debug = require("debugf");
var debuglog = debug('schemaload');
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
    debuglog(() => `modelpath is ${modelPath} `);
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
    var filename = modelPath + '/' + modelName + '.model.mongooseschema.json';
    debuglog(() => `attempting to read ${filename}`);
    var schemaSer = FUtils.readFileAsJSON(filename);
    schemaSer.modelName = modelName;
    return schemaSer;
}
exports.loadExtendedMongooseSchema = loadExtendedMongooseSchema;
function loadModelDoc(modelPath, modelName) {
    var docSer = FUtils.readFileAsJSON(modelPath + '/' + modelName + '.model.doc.json');
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
    return modelES;
}
exports.getExtendedSchemaModel = getExtendedSchemaModel;
function getModelDocModel(mongoose) {
    var metaDoc = FUtils.readFileAsJSON(__dirname + '/../../resources/meta/metamodels.model.doc.json');
    metaDoc.modelname = exports.MongoNLQ.MODELNAME_METAMODELS;
    var schemaSer2 = loadExtendedMongooseSchema(__dirname + '/../../resources/meta', exports.MongoNLQ.MODELNAME_METAMODELS);
    var schemaSer = augmentMongooseSchema(metaDoc, schemaSer2);
    var schema = makeMongooseSchema(schemaSer, mongoose);
    var mongooseModelName = makeMongooseModelName(exports.MongoNLQ.COLL_METAMODELS);
    if (mongoose.modelNames().indexOf(mongooseModelName) >= 0) {
        return mongoose.model(mongooseModelName);
    }
    var modelDoc = mongoose.model(makeMongooseModelName(exports.MongoNLQ.COLL_METAMODELS), schema);
    var oFind = modelDoc.find;
    return modelDoc;
}
exports.getModelDocModel = getModelDocModel;
function upsertMetaModel(mongoose) {
    debuglog(() => 'here dirname + ' + __dirname);
    var metaDoc = FUtils.readFileAsJSON(__dirname + '/../../resources/meta/metamodels.model.doc.json');
    debuglog(() => "here metaDoc to insert as loaded" + JSON.stringify(metaDoc));
    metaDoc.modelname = exports.MongoNLQ.MODELNAME_METAMODELS;
    var schemaSer2 = loadExtendedMongooseSchema(__dirname + '/../../resources/meta', exports.MongoNLQ.MODELNAME_METAMODELS);
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
        return mongoose.model('filler', new mongoose.Schema(SchemaFillers));
    }
}
exports.getOrCreateModelFillers = getOrCreateModelFillers;
function getOrCreateModelOperators(mongoose) {
    if (mongoose.modelNames().indexOf('operator') >= 0) {
        return mongoose.model('operator');
    }
    else {
        return mongoose.model('operator', new mongoose.Schema(SchemaOperators));
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
/**
 * Uploads the complete model (metadata!) information
 * Assumes metamodel has been loaded (see #upsertMetaModels)
 * @param mongoose {mongoose.Mongoose} the mongoose handle
 * @param modelpath {string}  the model path
 * @return Promise<any> the  promise
 */
function upsertModels(mongoose, modelpath) {
    debuglog(() => `modelpath ${modelpath} `);
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
    return new Promise(function (resolve, reject) {
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
/*
export function getModelRecByModelName(mongoose : any, modelPath: string, modelName : string) : Promise<IModelRec>  {
    // do we have the meta collection in the db?
    return Promise.all([
        mongoose.connection.db[MongoNLQ.COLL_METAMODELS].find({ modelName : modelName}),
        mongoose.connection.db[MongoNLQ.COLL_EXTENDEDSCHEMAS].find({ modelName : modelName})
    ]).then(res => {
        var modelDoc = res[0];
        var extendedSchema = res[1];
        var schema = makeMongooseSchema(extendedSchema);
        var model = mongoose.model(modelDoc.collectionName, schema);
        return {
            collectionName : modelDoc.collectionName,
            modelDoc : modelDoc,
            schema : makeMongooseSchema(extendedSchema),
            model : model
        } as IModelRec;
    });
}
*/
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
    debuglog(() => ` here json schema ` + (JSON.stringify(jsonSchema, undefined, 2)));
    var Validator = require('jsonschema').Validator;
    var v = new Validator();
    //console.log(JSON.stringify(jsonSchema,undefined,2));
    var valresult = v.validate(doc, jsonSchema);
    if (valresult.errors.length) {
        throw new Error("Schema validating against JSON Schema failed : " + JSON.stringify(valresult.errors, undefined, 2));
    }
    return true;
}
exports.validateDoc = validateDoc;

//# sourceMappingURL=schemaload.js.map

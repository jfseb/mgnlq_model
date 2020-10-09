"use strict";
/**
 * Functionality managing the match models
 *
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDoc = exports.validateDocVsMongooseModel = exports.validateDocMongoose = exports.MongooseNLQ = exports.MongoNLQ = exports.hasMetaCollection = exports.upsertModels = exports.uploadOperators = exports.uploadFillers = exports.makeModelFromDB = exports.getModelDocFromDB = exports.getExtendSchemaDocFromDB = exports.getOperatorsFromDB = exports.getFillersFromDB = exports.getOrCreateModelOperators = exports.getOrCreateModelFillers = exports.removeOthers = exports.createDBWithModels = exports.upsertMetaModel = exports.getModelDocModel = exports.getExtendedSchemaModel = exports.getExtendedSchema = exports.makeMongoCollectionName = exports.makeMongooseModelName = exports.augmentMongooseSchema = exports.loadModelDoc = exports.loadExtendedMongooseSchema = exports.makeMongooseSchema = exports.typeProps = exports.replaceIfTypeDeleteM = exports.mapType = exports.loadModelNames = exports.cmpTools = void 0;
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
    var mdls = FUtils.readFileAsJSON(modelPath + '/models.json');
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
 * return a modelname
 * @param collectionName
 */
function makeMongooseModelName(collectionName) {
    if (collectionName !== collectionName.toLowerCase()) {
        throw new Error('expect lowercase, was ' + collectionName);
    }
    if (collectionName.charAt(collectionName.length - 1) === 's') {
        return collectionName; // beware, ALTERED RECENTLY 28.08.2019
        // return collectionName.substring(0,collectionName.length-1);
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
        throw new Error(' expect trailing s:' + modelName);
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
    return model.aggregate([{ $project: { modelname: 1 } }]).then((r) => r.map(o => o.modelname)).then((modelnames) => {
        debuglog(" present models " + modelnames.length + ' ' + modelnames);
        var delta = _.difference(modelnames, retainedNames);
        debuglog(' spurious models: ' + delta.length + ' ' + delta);
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
    if (mongoose.modelNames().indexOf('fillers') >= 0) {
        return mongoose.model('fillers');
    }
    else {
        return mongoose.model('fillers', new mongoose.Schema(SchemaFillers));
    }
}
exports.getOrCreateModelFillers = getOrCreateModelFillers;
function getOrCreateModelOperators(mongoose) {
    if (mongoose.modelNames().indexOf('operators') >= 0) {
        return mongoose.model('operators');
    }
    else {
        return mongoose.model('operators', new mongoose.Schema(SchemaOperators));
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
        console.log(' moongooseModelName : ' + mongooseModelName + ' ' + modelName);
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
        var fillers = FUtils.readFileAsJSON(modelPath + '/filler.json');
        return new modelFiller({ fillers: fillers }).save();
    });
}
exports.uploadFillers = uploadFillers;
function uploadOperators(mongoose, modelPath) {
    var modelFiller = getOrCreateModelOperators(mongoose);
    return modelFiller.remove({}).then(() => {
        var operators = FUtils.readFileAsJSON(modelPath + '/operators.json');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hbG9hZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbGxvYWQvc2NoZW1hbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBRUgsb0NBQW9DO0FBQ3BDLGdDQUFnQztBQUVoQyxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7QUFTbkMseUNBQXlDO0FBRXpDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMsbUNBQW1DO0FBQ25DLDRCQUE0QjtBQUM1QixxQ0FBcUM7QUFFcEMsUUFBZ0IsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUUzQzs7R0FFRztBQUNILE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hEOztHQUVHO0FBQ0gsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLHVDQUF1QyxDQUFDO0FBRTVGLFNBQWdCLFFBQVEsQ0FBQyxDQUFlLEVBQUUsQ0FBZTtJQUN2RCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRkQsNEJBRUM7QUFLRCxNQUFNLG9CQUFvQixHQUFHO0lBQ3pCLFdBQVcsRUFBRTtRQUNYLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcsSUFBSTtLQUNsQjtJQUNELFFBQVEsRUFBRTtRQUNSLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcsSUFBSTtLQUNsQjtJQUNELG1CQUFtQixFQUFFO1FBQ25CLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcsSUFBSTtLQUNsQjtJQUNELGdCQUFnQixFQUFFO1FBQ2hCLE1BQU0sRUFB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
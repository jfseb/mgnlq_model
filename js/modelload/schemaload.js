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
        return Promise.all(delta.map(modelname => model.deleteMany({ modelname: modelname })));
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
    return modelFiller.deleteMany({}).then(() => {
        var fillers = FUtils.readFileAsJSON(modelPath + '/filler.json');
        return new modelFiller({ fillers: fillers }).save();
    });
}
exports.uploadFillers = uploadFillers;
function uploadOperators(mongoose, modelPath) {
    var modelFiller = getOrCreateModelOperators(mongoose);
    return modelFiller.deleteMany({}).then(() => {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tb2RlbGxvYWQvc2NoZW1hbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBRUgsb0NBQW9DO0FBQ3BDLGdDQUFnQztBQUVoQyxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7QUFTbkMseUNBQXlDO0FBRXpDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMsbUNBQW1DO0FBQ25DLDRCQUE0QjtBQUM1QixxQ0FBcUM7QUFFcEMsUUFBZ0IsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUUzQzs7R0FFRztBQUNILE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hEOztHQUVHO0FBQ0gsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLHVDQUF1QyxDQUFDO0FBRTVGLFNBQWdCLFFBQVEsQ0FBQyxDQUFlLEVBQUUsQ0FBZTtJQUN2RCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRkQsNEJBRUM7QUFLRCxNQUFNLG9CQUFvQixHQUFHO0lBQ3pCLFdBQVcsRUFBRTtRQUNYLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcsSUFBSTtLQUNsQjtJQUNELFFBQVEsRUFBRTtRQUNSLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcsSUFBSTtLQUNsQjtJQUNELG1CQUFtQixFQUFFO1FBQ25CLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcsSUFBSTtLQUNsQjtJQUNELGdCQUFnQixFQUFFO1FBQ2hCLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcs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QVcsR0FBSSxNQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDL0MsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsVUFBUyxHQUFHLEVBQUMsR0FBRyxFQUFDLEdBQUc7UUFDaEQsSUFBRyxHQUFHLEtBQUssWUFBWSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO1lBQzlDLG1DQUFtQztZQUNuQyxHQUFHLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO1NBQ3BDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRSxFQUFFLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9FLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDaEQsSUFBSSxDQUFDLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztJQUN4QixzREFBc0Q7SUFDdEQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUMsVUFBVSxDQUFDLENBQUM7SUFDM0MsSUFBRyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtRQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLGlEQUFpRCxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNySDtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQW5CRCxrQ0FtQkMiLCJmaWxlIjoibW9kZWxsb2FkL3NjaGVtYWxvYWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRnVuY3Rpb25hbGl0eSBtYW5hZ2luZyB0aGUgbWF0Y2ggbW9kZWxzXHJcbiAqXHJcbiAqIEBmaWxlXHJcbiAqL1xyXG5cclxuLy9pbXBvcnQgKiBhcyBpbnRmIGZyb20gJ2NvbnN0YW50cyc7XHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnZic7XHJcblxyXG52YXIgZGVidWdsb2cgPSBkZWJ1Zygnc2NoZW1hbG9hZCcpO1xyXG5cclxuLy9jb25zdCBsb2FkbG9nID0gbG9nZ2VyLmxvZ2dlcignbW9kZWxsb2FkJywgJycpO1xyXG5cclxuaW1wb3J0ICogIGFzIElNYXRjaCBmcm9tICcuLi9tYXRjaC9pZm1hdGNoJztcclxuLy9pbXBvcnQgKiBhcyBJbnB1dEZpbHRlclJ1bGVzIGZyb20gJy4uL21hdGNoL3J1bGUnO1xyXG4vL2ltcG9ydCAqIGFzIFRvb2xzIGZyb20gJy4uL21hdGNoL3Rvb2xzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgKiBhcyBNZXRhIGZyb20gJy4uL21vZGVsL21ldGEnO1xyXG5pbXBvcnQgKiBhcyBGVXRpbHMgZnJvbSAnLi4vbW9kZWwvbW9kZWwnO1xyXG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICdhYm90X3V0aWxzJztcclxuLy9pbXBvcnQgKiBhcyBDaXJjdWxhclNlciBmcm9tICdhYm90X3V0aWxzJztcclxuLy9pbXBvcnQgKiBhcyBEaXN0YW5jZSBmcm9tICdhYm90X3N0cmluZ2Rpc3QnO1xyXG5pbXBvcnQgKiBhcyBwcm9jZXNzIGZyb20gJ3Byb2Nlc3MnO1xyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcbmltcG9ydCAqIGFzIG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcclxuXHJcbihtb25nb29zZSBhcyBhbnkpLlByb21pc2UgPSBnbG9iYWwuUHJvbWlzZTtcclxuXHJcbi8qKlxyXG4gKiBXQVRDSCBvdXQsIHRoaXMgaW5zdHJ1bWVudHMgbW9uZ29vc2UhXHJcbiAqL1xyXG5yZXF1aXJlKCdtb25nb29zZS1zY2hlbWEtanNvbnNjaGVtYScpKG1vbmdvb3NlKTtcclxuLyoqXHJcbiAqIHRoZSBtb2RlbCBwYXRoLCBtYXkgYmUgY29udHJvbGxlZCB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVcclxuICovXHJcbnZhciBlbnZNb2RlbFBhdGggPSBwcm9jZXNzLmVudltcIkFCT1RfTU9ERUxQQVRIXCJdIHx8IFwibm9kZV9tb2R1bGVzL2Fib3RfdGVzdG1vZGVsL3Rlc3Rtb2RlbFwiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNtcFRvb2xzKGE6IElNYXRjaC5JVG9vbCwgYjogSU1hdGNoLklUb29sKSB7XHJcbiAgcmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSk7XHJcbn1cclxuXHJcblxyXG50eXBlIElNb2RlbCA9IElNYXRjaC5JTW9kZWw7XHJcblxyXG5jb25zdCBFeHRlbmRlZFNjaGVtYV9wcm9wcyA9IHtcclxuICAgIFwibW9kZWxuYW1lXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFN0cmluZyxcclxuICAgICAgXCJ0cmltXCI6IHRydWUsXHJcbiAgICAgIFwicmVxdWlyZWRcIiA6IHRydWVcclxuICAgIH0sXHJcbiAgICBcImRvbWFpblwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBTdHJpbmcsXHJcbiAgICAgIFwidHJpbVwiOiB0cnVlLFxyXG4gICAgICBcInJlcXVpcmVkXCIgOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgXCJtb25nb29zZW1vZGVsbmFtZVwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBTdHJpbmcsXHJcbiAgICAgIFwidHJpbVwiOiB0cnVlLFxyXG4gICAgICBcInJlcXVpcmVkXCIgOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgXCJjb2xsZWN0aW9ubmFtZVwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBTdHJpbmcsXHJcbiAgICAgIFwidHJpbVwiOiB0cnVlLFxyXG4gICAgICBcInJlcXVpcmVkXCIgOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgXCJwcm9wc1wiIDoge30sXHJcbiAgICBcImluZGV4XCIgOiB7fVxyXG59O1xyXG5jb25zdCBFeHRlbmRlZFNjaGVtYV9pbmRleCA9IHtcclxuICAgIFwibW9kZWxuYW1lXCIgOiBcInRleHRcIlxyXG59O1xyXG5cclxuXHJcblxyXG4vLyBsb2FkIHRoZSBtb2RlbHNcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkTW9kZWxOYW1lcyhtb2RlbFBhdGggOiBzdHJpbmcpIDogc3RyaW5nW10ge1xyXG4gIG1vZGVsUGF0aCA9IG1vZGVsUGF0aCB8fCBlbnZNb2RlbFBhdGg7XHJcbiAgZGVidWdsb2coKCk9PiBgbW9kZWxwYXRoIGlzICR7bW9kZWxQYXRofSBgKTtcclxuICB2YXIgbWRscyA9IEZVdGlscy5yZWFkRmlsZUFzSlNPTihtb2RlbFBhdGggKyAnL21vZGVscy5qc29uJyk7XHJcbiAgbWRscy5mb3JFYWNoKG5hbWUgPT4ge1xyXG4gICAgaWYobmFtZSAhPT0gbWFrZU1vbmdvQ29sbGVjdGlvbk5hbWUobmFtZSkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBtb2RlbG5hbWUsIG11c3QgdGVybWluYXRlIHdpdGggcyBhbmQgYmUgbG93ZXJjYXNlJyk7XHJcbiAgICB9XHJcbiAgfSlcclxuICByZXR1cm4gbWRscztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJUmF3U2NoZW1hIHtcclxuICAgIHByb3BzOiBhbnlbXSxcclxuICAgIGluZGV4IDogYW55XHJcbn1cclxuXHJcbi8qXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU1vZGVsRG9jQ2F0ZWdvcnlSZWMge1xyXG4gICAgY2F0ZWdvcnkgOiBzdHJpbmcsXHJcbiAgICBjYXRlZ29yeV9kZXNjcmlwdGlvbiA6IHN0cmluZyxcclxuICAgIFFCRUNvbHVtblByb3BzIDoge1xyXG4gICAgICAgIFwiZGVmYXVsdFdpZHRoXCI6IG51bWJlcixcclxuICAgICAgICBcIlFCRVwiOiBib29sZWFuLFxyXG4gICAgICAgIFwiTFVOUkluZGV4XCI6IGJvb2xlYW5cclxuICAgICAgfSxcclxuICAgICAgXCJjYXRlZ29yeV9zeW5vbnltc1wiOiBzdHJpbmdbXSxcclxuICAgIHdvcmRpbmRleCA6IGJvb2xlYW4sXHJcbiAgICBleGFjdG1hdGNoOiBib29sZWFuLFxyXG4gICAgc2hvd01cclxufTtcclxuKi9cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU1vZGVsRG9jIHtcclxuICAgIGRvbWFpbiA6IHN0cmluZyxcclxuICAgIG1vZGVsbmFtZT8gOiBzdHJpbmcsXHJcbiAgICBjb2xsZWN0aW9ubmFtZT8gOiBzdHJpbmcsXHJcbiAgICBkb21haW5fZGVzY3JpcHRpb24gOiBzdHJpbmdcclxuICAgIF9jYXRlZ29yaWVzIDogSU1hdGNoLklNb2RlbENhdGVnb3J5UmVjW10sXHJcbiAgICBjb2x1bW5zOiBzdHJpbmdbXSxcclxuICAgIGRvbWFpbl9zeW5vbnltcyA6IHN0cmluZ1tdXHJcblxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElFeHRlbmRlZFNjaGVtYSBleHRlbmRzIElSYXdTY2hlbWF7XHJcbiAgICBkb21haW4gOiBzdHJpbmcsXHJcbiAgICBtb2RlbG5hbWUgOiBzdHJpbmcsXHJcbiAgICBtb25nb29zZW1vZGVsbmFtZSA6IHN0cmluZyxcclxuICAgIGNvbGxlY3Rpb25uYW1lIDogc3RyaW5nXHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWFwVHlwZSh2YWwgOiBzdHJpbmcpIDogYW55IHtcclxuICAgIGlmKHZhbCA9PT0gXCJTdHJpbmdcIikge1xyXG4gICAgICAgIHJldHVybiBTdHJpbmc7XHJcbiAgICB9XHJcbiAgICBpZih2YWwgPT09IFwiQm9vbGVhblwiKSB7XHJcbiAgICAgICAgcmV0dXJuIEJvb2xlYW47XHJcbiAgICB9XHJcbiAgICBpZih2YWwgPT09IFwiTnVtYmVyXCIpIHtcclxuICAgICAgICByZXR1cm4gTnVtYmVyO1xyXG4gICAgfVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiIGlsbGVnYWwgdHlwZSBcIiArIHZhbCArIFwiIGV4cGVjdGVkIFN0cmluZywgQm9vbGVhbiwgTnVtYmVyLCAuLi5cIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZXBsYWNlSWZUeXBlRGVsZXRlTShvYmogOiBhbnksIHZhbCA6IGFueSwga2V5IDogc3RyaW5nKSB7XHJcbiAgICBpZihrZXkuc3Vic3RyKDAsMykgPT09IFwiX21fXCIpIHtcclxuICAgICAgICBkZWxldGUgb2JqW2tleV07XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfTtcclxuICAgIGlmKGtleSA9PT0gXCJ0eXBlXCIgJiYgdHlwZW9mIHZhbCA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgIHZhciByID0gbWFwVHlwZSh2YWwpO1xyXG4gICAgICAgIG9ialtrZXldID0gcjtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhdmVyc2VFeGVjdXRpbmcob2JqLCBmbiApIHtcclxuICAgIF8uZm9ySW4ob2JqLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcclxuICAgIC8vICAgIGNvbnNvbGUubG9nKHZhbCArIFwiIC0+IFwiICsga2V5ICsgXCIgXCIpO1xyXG4gICAgICAgIGZuKG9iaix2YWwsa2V5KTtcclxuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbCkpIHtcclxuICAgICAgICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24oZWwpIHtcclxuICAgICAgICAgICAgICAgIGlmIChfLmlzT2JqZWN0KGVsKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYXZlcnNlRXhlY3V0aW5nKGVsLGZuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfLmlzT2JqZWN0KHZhbCkpIHtcclxuICAgICAgICAgICAgdHJhdmVyc2VFeGVjdXRpbmcob2JqW2tleV0sZm4pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cmF2ZXJzZVJlcGxhY2luZ1R5cGUob2JqKSB7XHJcbiAgICByZXR1cm4gdHJhdmVyc2VFeGVjdXRpbmcob2JqLHJlcGxhY2VJZlR5cGVEZWxldGVNKTtcclxuICAgIC8qXHJcbiAgICBfLmZvckluKG9iaiwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XHJcbiAgICAvLyAgICBjb25zb2xlLmxvZyh2YWwgKyBcIiAtPiBcIiArIGtleSArIFwiIFwiKTtcclxuICAgICAgICByZXBsYWNlSWZUeXBlRGVsZXRlTShvYmosdmFsLGtleSk7XHJcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWwpKSB7XHJcbiAgICAgICAgICAgIHZhbC5mb3JFYWNoKGZ1bmN0aW9uKGVsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoXy5pc09iamVjdChlbCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZVJlcGxhY2luZ1R5cGUoZWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKF8uaXNPYmplY3QodmFsKSkge1xyXG4gICAgICAgICAgICB0cmF2ZXJzZVJlcGxhY2luZ1R5cGUob2JqW2tleV0pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgKi9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVQcm9wcyhhIDogYW55KSA6IGFueSB7XHJcbiAgIHZhciBhQ2xvbmVkID0gXy5jbG9uZURlZXAoYSk7XHJcbiAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYUNsb25lZCwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgIHRyYXZlcnNlUmVwbGFjaW5nVHlwZShhQ2xvbmVkKTtcclxuICAgcmV0dXJuIGFDbG9uZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWtlTW9uZ29vc2VTY2hlbWEoIGV4dFNjaGVtYSA6IElFeHRlbmRlZFNjaGVtYSAsIG1vbmdvPyA6IGFueSkgOiBtb25nb29zZS5TY2hlbWEge1xyXG4gICAgdmFyIHR5cGVkUHJvcHMgPSB0eXBlUHJvcHMoZXh0U2NoZW1hLnByb3BzKTtcclxuICAgIHZhciBtb25nbyA9IG1vbmdvIHx8IG1vbmdvb3NlO1xyXG4gICAgIHZhciBzY2hlbWEgPSBtb25nby5TY2hlbWEoZXh0U2NoZW1hLnByb3BzKTsgLy97IHByb3BzIDogZXh0U2NoZW1hLnByb3BzLCBpbmRleCA6IGV4dFNjaGVtYS5pbmRleCAgfSk7XHJcbiAgICAgc2NoZW1hLmluZGV4KGV4dFNjaGVtYS5pbmRleCk7XHJcbiAgICAgcmV0dXJuIHNjaGVtYTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRFeHRlbmRlZE1vbmdvb3NlU2NoZW1hKG1vZGVsUGF0aDogc3RyaW5nLCBtb2RlbE5hbWUgOiBzdHJpbmcpOiBJRXh0ZW5kZWRTY2hlbWEge1xyXG4gIHZhciBmaWxlbmFtZSA9ICBtb2RlbFBhdGggKyAnLycgKyBtb2RlbE5hbWUgKyAnLm1vZGVsLm1vbmdvb3Nlc2NoZW1hLmpzb24nO1xyXG4gIGRlYnVnbG9nKCgpPT4gYGF0dGVtcHRpbmcgdG8gcmVhZCAke2ZpbGVuYW1lfWApXHJcbiAgdmFyIHNjaGVtYVNlciA9IEZVdGlscy5yZWFkRmlsZUFzSlNPTihmaWxlbmFtZSk7XHJcbiAgc2NoZW1hU2VyLm1vZGVsTmFtZSA9IG1vZGVsTmFtZTtcclxuICByZXR1cm4gc2NoZW1hU2VyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9hZE1vZGVsRG9jKG1vZGVsUGF0aDogc3RyaW5nLCBtb2RlbE5hbWUgOiBzdHJpbmcpOiBJTW9kZWxEb2Mge1xyXG4gIHZhciBkb2NTZXIgPSBGVXRpbHMucmVhZEZpbGVBc0pTT04oIG1vZGVsUGF0aCArICcvJyArIG1vZGVsTmFtZSArICcubW9kZWwuZG9jLmpzb24nKTtcclxuICBkb2NTZXIubW9kZWxuYW1lID0gbW9kZWxOYW1lO1xyXG4gIHJldHVybiBkb2NTZXI7XHJcbn1cclxuXHJcbnZhciBhUHJvbWlzZSA9IGdsb2JhbC5Qcm9taXNlO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJTW9kZWxSZWMgIHtcclxuICAgIGNvbGxlY3Rpb25OYW1lIDogc3RyaW5nLFxyXG4gICAgbW9kZWwgOiBtb25nb29zZS5Nb2RlbDxhbnk+LFxyXG4gICAgc2NoZW1hIDogbW9uZ29vc2UuU2NoZW1hXHJcbn07XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRNb25nb29zZVNjaGVtYSggbW9kZWxEb2MgOiBJTW9kZWxEb2MsIHNjaGVtYVJhdyA6IElSYXdTY2hlbWEpIDogSUV4dGVuZGVkU2NoZW1hIHtcclxuICAgIGRlYnVnbG9nKCAoKT0+J2F1Z21lbnRpbmcgZm9yICcgKyBtb2RlbERvYy5tb2RlbG5hbWUpO1xyXG4gICAgdmFyIHJlcyA9IHsgZG9tYWluIDogbW9kZWxEb2MuZG9tYWluLFxyXG4gICAgICAgIG1vZGVsbmFtZSA6IG1vZGVsRG9jLm1vZGVsbmFtZSxcclxuICAgICAgICBtb25nb29zZW1vZGVsbmFtZSA6IG1ha2VNb25nb29zZU1vZGVsTmFtZShtb2RlbERvYy5tb2RlbG5hbWUpLFxyXG4gICAgICAgIGNvbGxlY3Rpb25uYW1lIDogbWFrZU1vbmdvQ29sbGVjdGlvbk5hbWUobW9kZWxEb2MubW9kZWxuYW1lKVxyXG4gICAgIH0gYXMgSUV4dGVuZGVkU2NoZW1hO1xyXG4gICAgcmV0dXJuIChPYmplY3QgYXMgYW55KS5hc3NpZ24ocmVzLCBzY2hlbWFSYXcpO1xyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJuIGEgbW9kZWxuYW1lXHJcbiAqIEBwYXJhbSBjb2xsZWN0aW9uTmFtZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VNb25nb29zZU1vZGVsTmFtZShjb2xsZWN0aW9uTmFtZSA6IHN0cmluZykgOiBzdHJpbmcge1xyXG4gICAgaWYoY29sbGVjdGlvbk5hbWUgIT09IGNvbGxlY3Rpb25OYW1lLnRvTG93ZXJDYXNlKCkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdCBsb3dlcmNhc2UsIHdhcyAnICsgY29sbGVjdGlvbk5hbWUpO1xyXG4gICAgfVxyXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLmNoYXJBdChjb2xsZWN0aW9uTmFtZS5sZW5ndGgtMSkgPT09ICdzJykge1xyXG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uTmFtZTsgLy8gYmV3YXJlLCBBTFRFUkVEIFJFQ0VOVExZIDI4LjA4LjIwMTlcclxuICAgICAgICAvLyByZXR1cm4gY29sbGVjdGlvbk5hbWUuc3Vic3RyaW5nKDAsY29sbGVjdGlvbk5hbWUubGVuZ3RoLTEpO1xyXG4gICAgfVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3RlZCBuYW1lIHdpdGggdHJhaWxpbmcgcycpO1xyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJucyBhIG1vbmdvb3NlIGNvbGxlY3Rpb24gbmFtZVxyXG4gKiBAcGFyYW0gbW9kZWxOYW1lXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFrZU1vbmdvQ29sbGVjdGlvbk5hbWUobW9kZWxOYW1lIDogc3RyaW5nKSA6IHN0cmluZyB7XHJcbiAgICBpZihtb2RlbE5hbWUgIT09IG1vZGVsTmFtZS50b0xvd2VyQ2FzZSgpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3QgbG93ZXJjYXNlLCB3YXMgJyArIG1vZGVsTmFtZSk7XHJcbiAgICB9XHJcbiAgICBpZiAobW9kZWxOYW1lLmNoYXJBdChtb2RlbE5hbWUubGVuZ3RoLTEpICE9PSAncycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJyBleHBlY3QgdHJhaWxpbmcgczonICsgbW9kZWxOYW1lICk7XHJcbiAgICB9XHJcbiAgICBpZiAobW9kZWxOYW1lLmNoYXJBdChtb2RlbE5hbWUubGVuZ3RoLTEpICE9PSAncycpIHtcclxuICAgICAgICByZXR1cm4gbW9kZWxOYW1lICsgJ3MnO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1vZGVsTmFtZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuZGVkU2NoZW1hKG1vbmdvb3NlIDogYW55KSA6IG1vbmdvb3NlLlNjaGVtYSB7XHJcbiAgdmFyIGV4dGVuZFNjaGVtYSA9IG1vbmdvb3NlLlNjaGVtYShFeHRlbmRlZFNjaGVtYV9wcm9wcyk7XHJcbiAgICAvL2NvbnNvbGUubG9nKFwibm93IGV4dGVuZGVkIHNjaGVtYVwiKTtcclxuICAgIGV4dGVuZFNjaGVtYS5pbmRleChFeHRlbmRlZFNjaGVtYV9pbmRleCk7XHJcbiAgICByZXR1cm4gZXh0ZW5kU2NoZW1hO1xyXG4gICAgLy9jb25zb2xlLmxvZygnY3JlYXRpbmcgbW9kZWwgMicpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZW5kZWRTY2hlbWFNb2RlbChtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlKSA6IG1vbmdvb3NlLk1vZGVsPGFueT4ge1xyXG4gICAgdmFyIG1nTW9kZWxOYW1lID0gbWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfRVhURU5ERURTQ0hFTUFTKVxyXG4gICAgaWYobW9uZ29vc2UubW9kZWxOYW1lcygpLmluZGV4T2YobWdNb2RlbE5hbWUpID49IDApIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwobWdNb2RlbE5hbWUpO1xyXG4gICAgfVxyXG4gICAgdmFyIGV4dGVuZFNjaGVtYSA9IGdldEV4dGVuZGVkU2NoZW1hKG1vbmdvb3NlKTtcclxuICAgIHZhciBtb2RlbEVTID0gbW9uZ29vc2UubW9kZWwobWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfRVhURU5ERURTQ0hFTUFTKSwgZXh0ZW5kU2NoZW1hKTtcclxuICAgIHJldHVybiBtb2RlbEVTO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsRG9jTW9kZWwobW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSkgOiBtb25nb29zZS5Nb2RlbDxhbnk+IHtcclxuICAgIHZhciBtZXRhRG9jID0gRlV0aWxzLnJlYWRGaWxlQXNKU09OKCBfX2Rpcm5hbWUgKyAnLy4uLy4uL3Jlc291cmNlcy9tZXRhL21ldGFtb2RlbHMubW9kZWwuZG9jLmpzb24nKTtcclxuICAgIG1ldGFEb2MubW9kZWxuYW1lID0gTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFM7XHJcbiAgICB2YXIgc2NoZW1hU2VyMiA9IGxvYWRFeHRlbmRlZE1vbmdvb3NlU2NoZW1hKF9fZGlybmFtZSArICcvLi4vLi4vcmVzb3VyY2VzL21ldGEnLE1vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTKTtcclxuICAgIHZhciBzY2hlbWFTZXIgPSBhdWdtZW50TW9uZ29vc2VTY2hlbWEobWV0YURvYywgc2NoZW1hU2VyMik7XHJcbiAgICB2YXIgc2NoZW1hID0gbWFrZU1vbmdvb3NlU2NoZW1hKHNjaGVtYVNlciwgbW9uZ29vc2UpO1xyXG4gICAgdmFyIG1vbmdvb3NlTW9kZWxOYW1lID0gbWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfTUVUQU1PREVMUyk7XHJcbiAgICBpZiAobW9uZ29vc2UubW9kZWxOYW1lcygpLmluZGV4T2YobW9uZ29vc2VNb2RlbE5hbWUpID49IDApIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwobW9uZ29vc2VNb2RlbE5hbWUpO1xyXG4gICAgfVxyXG4gICAgdmFyIG1vZGVsRG9jID0gbW9uZ29vc2UubW9kZWwobWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfTUVUQU1PREVMUyksIHNjaGVtYSApO1xyXG4gICAgdmFyIG9GaW5kID0gbW9kZWxEb2MuZmluZDtcclxuICAgICByZXR1cm4gbW9kZWxEb2M7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1cHNlcnRNZXRhTW9kZWwobW9uZ29vc2UgOiBhbnkpIHtcclxuICAgIGRlYnVnbG9nKCgpPT4naGVyZSBkaXJuYW1lICsgJyArIF9fZGlybmFtZSk7XHJcbiAgICB2YXIgbWV0YURvYyA9IEZVdGlscy5yZWFkRmlsZUFzSlNPTihfX2Rpcm5hbWUgKyAnLy4uLy4uL3Jlc291cmNlcy9tZXRhL21ldGFtb2RlbHMubW9kZWwuZG9jLmpzb24nKTtcclxuICAgIGRlYnVnbG9nKCAoKT0+IFwiaGVyZSBtZXRhRG9jIHRvIGluc2VydCBhcyBsb2FkZWRcIiArIEpTT04uc3RyaW5naWZ5KG1ldGFEb2MpKTtcclxuICAgIG1ldGFEb2MubW9kZWxuYW1lID0gTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFM7XHJcbiAgICB2YXIgc2NoZW1hU2VyMiA9IGxvYWRFeHRlbmRlZE1vbmdvb3NlU2NoZW1hKF9fZGlybmFtZSArICcvLi4vLi4vcmVzb3VyY2VzL21ldGEnLE1vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTKTtcclxuICAgIHZhciBzY2hlbWFTZXIgPSBhdWdtZW50TW9uZ29vc2VTY2hlbWEobWV0YURvYywgc2NoZW1hU2VyMik7XHJcblxyXG4gICAgZGVidWdsb2coICgpPT4naGVyZSBzY2hlbWFzZXInICsgSlNPTi5zdHJpbmdpZnkoc2NoZW1hU2VyLHVuZGVmaW5lZCwyKSk7XHJcbiAgICAobW9uZ29vc2UgYXMgYW55KS5Qcm9taXNlID0gZ2xvYmFsLlByb21pc2U7XHJcbiAgICB2YXIgc2NoZW1hID0gbWFrZU1vbmdvb3NlU2NoZW1hKHNjaGVtYVNlciwgbW9uZ29vc2UpO1xyXG4gICAgLy9jb25zb2xlLmxvZyhcIm1ha2Ugc2NoZW1hIDFcIik7XHJcbiAgICAvL3ZhciBleHRlbmRTY2hlbWEgPSBtb25nb29zZS5TY2hlbWEoRXh0ZW5kZWRTY2hlbWFfcHJvcHMpO1xyXG4gICAgLy8vY29uc29sZS5sb2coXCJub3cgZXh0ZW5kZWQgc2NoZW1hXCIpO1xyXG4gICAgLy9leHRlbmRTY2hlbWEuaW5kZXgoRXh0ZW5kZWRTY2hlbWFfaW5kZXgpO1xyXG4gICAgLy9jb25zb2xlLmxvZyhcIm5vdyBkb2N1bWVudCAuLi5cIiArIEpTT04uc3RyaW5naWZ5KGV4dGVuZFNjaGVtYSx1bmRlZmluZWQsMikpO1xyXG4gICAgdmFyIG1vZGVsRG9jID0gbW9uZ29vc2UubW9kZWwobWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfTUVUQU1PREVMUyksIHNjaGVtYSApO1xyXG4gICAgLy9jb25zb2xlLmxvZygnY3JlYXRpbmcgbW9kZWwgMicpO1xyXG4gICAgdmFyIG1vZGVsRVMgPSBnZXRFeHRlbmRlZFNjaGVtYU1vZGVsKG1vbmdvb3NlKTsgLy9tb25nb29zZS5tb2RlbChtYWtlTW9uZ29vc2VNb2RlbE5hbWUoTW9uZ29OTFEuQ09MTF9FWFRFTkRFRFNDSEVNQVMpLCBleHRlbmRTY2hlbWEpO1xyXG5cclxuICAgIGRlYnVnbG9nKCAoKT0+IFwiaGVyZSBtZXRhRG9jIHRvIGluc2VydFwiICsgSlNPTi5zdHJpbmdpZnkobWV0YURvYykpO1xyXG4gICAgZGVidWdsb2coICgpPT5cImhlcmUgc2NoZW1hc2VyIHRvIGluc2VydFwiICsgSlNPTi5zdHJpbmdpZnkoc2NoZW1hU2VyKSk7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xyXG4gICAgICAgIHZhbGlkYXRlRG9jVnNNb25nb29zZU1vZGVsKG1vZGVsRG9jLCBtZXRhRG9jKS50aGVuKCAoKT0+XHJcbiAgICAgICAgICAgIG1vZGVsRG9jLmZpbmRPbmVBbmRVcGRhdGUoIHsgbW9kZWxuYW1lIDogIE1vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTfSwgbWV0YURvYywge1xyXG4gICAgICAgICAgICAgICAgdXBzZXJ0IDogdHJ1ZVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICksXHJcbiAgICAgICAgdmFsaWRhdGVEb2NWc01vbmdvb3NlTW9kZWwobW9kZWxFUyxzY2hlbWFTZXIpLnRoZW4oICgpPT5cclxuICAgICAgICAgICAgbW9kZWxFUy5maW5kT25lQW5kVXBkYXRlKCB7IG1vZGVsbmFtZSA6ICBNb25nb05MUS5NT0RFTE5BTUVfTUVUQU1PREVMU30sIHNjaGVtYVNlciwge1xyXG4gICAgICAgICAgICAgICAgdXBzZXJ0IDogdHJ1ZVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICldKTsgLy8udGhlbiggKCkgPT4gcHJvY2Vzcy5leGl0KC0xKSk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlREJXaXRoTW9kZWxzKG1vbmdvb3NlIDogbW9uZ29vc2UuTW9uZ29vc2UgLCBtb2RlbFBhdGggOiBzdHJpbmcpIDogUHJvbWlzZTxhbnk+IHtcclxuICAgIHJldHVybiB1cHNlcnRNZXRhTW9kZWwobW9uZ29vc2UpLnRoZW4oXHJcbiAgICAgICAgdXBzZXJ0TW9kZWxzLmJpbmQodW5kZWZpbmVkLCBtb25nb29zZSwgbW9kZWxQYXRoKVxyXG4gICAgKTtcclxufVxyXG5cclxuXHJcbi8vZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsTmFtZXMobW9kZWwgOiBtb25nb29zZS5tb2RlbCwgKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZU90aGVycyhtb25nb29zZSA6IGFueSwgbW9kZWw6IG1vbmdvb3NlLk1vZGVsPGFueT4sIHJldGFpbmVkTmFtZXMgOiBzdHJpbmdbXSApIDogUHJvbWlzZTxhbnk+IHtcclxuICAgIC8vY29uc29sZS5sb2coJ2hlcmUgY29sbGVjdGlvbm5hbWUnICsgT2JqZWN0LmtleXMobW9kZWwpKTtcclxuICAgIC8vY29uc29sZS5sb2coJ2hlcmUgY29sbGVjdGlvbm5hbWUnICsgbW9kZWwuY29sbGVjdGlvbm5hbWUpO1xyXG4gICAgcmV0dXJuIChtb2RlbC5hZ2dyZWdhdGUoW3skcHJvamVjdCA6IHsgbW9kZWxuYW1lIDogMSB9fV0pIGFzIGFueSkudGhlbiggKHIpID0+XHJcbiAgICAgICAgci5tYXAobyA9PiAobyBhcyBhbnkpLm1vZGVsbmFtZSBhcyBzdHJpbmcpXHJcbiAgICApLnRoZW4oIChtb2RlbG5hbWVzIDogYW55KSA9PiB7XHJcbiAgICAgICAgZGVidWdsb2coXCIgcHJlc2VudCBtb2RlbHMgXCIgKyBtb2RlbG5hbWVzLmxlbmd0aCArICcgJyArIG1vZGVsbmFtZXMpO1xyXG4gICAgICAgIHZhciBkZWx0YSA9IF8uZGlmZmVyZW5jZShtb2RlbG5hbWVzLCByZXRhaW5lZE5hbWVzKTtcclxuICAgICAgICBkZWJ1Z2xvZygnIHNwdXJpb3VzIG1vZGVsczogJyArIGRlbHRhLmxlbmd0aCArICcgJyArIGRlbHRhKTtcclxuICAgICAgICBpZihkZWx0YS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGRlbHRhLm1hcCggbW9kZWxuYW1lID0+IChtb2RlbC5kZWxldGVNYW55IGFzIGFueSkoeyBtb2RlbG5hbWUgOiBtb2RlbG5hbWV9KSkpO1xyXG4gICAgfSk7XHJcbn1cclxudmFyIFNjaGVtYU9wZXJhdG9ycyA9IHsgb3BlcmF0b3JzIDoge30sIHN5bm9ueW1zIDoge319O1xyXG5cclxudmFyIFNjaGVtYUZpbGxlcnMgPSB7IGZpbGxlcnMgOiBbe1xyXG4gICAgdHlwZSA6IFN0cmluZ1xyXG59XVxyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE9yQ3JlYXRlTW9kZWxGaWxsZXJzKG1vbmdvb3NlOiBtb25nb29zZS5Nb25nb29zZSkgOiBtb25nb29zZS5Nb2RlbDxhbnk+IHtcclxuICAgIGlmKG1vbmdvb3NlLm1vZGVsTmFtZXMoKS5pbmRleE9mKCdmaWxsZXJzJykgPj0gMCkge1xyXG4gICAgICAgIHJldHVybiBtb25nb29zZS5tb2RlbCgnZmlsbGVycycpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwoJ2ZpbGxlcnMnLCBuZXcgbW9uZ29vc2UuU2NoZW1hKFNjaGVtYUZpbGxlcnMpKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE9yQ3JlYXRlTW9kZWxPcGVyYXRvcnMobW9uZ29vc2U6IG1vbmdvb3NlLk1vbmdvb3NlKSA6IG1vbmdvb3NlLk1vZGVsPGFueT4ge1xyXG4gICAgaWYobW9uZ29vc2UubW9kZWxOYW1lcygpLmluZGV4T2YoJ29wZXJhdG9ycycpID49IDApIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwoJ29wZXJhdG9ycycpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwoJ29wZXJhdG9ycycsIG5ldyBtb25nb29zZS5TY2hlbWEoU2NoZW1hT3BlcmF0b3JzKSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxsZXJzRnJvbURCKCBtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlKSA6IFByb21pc2U8YW55PiB7XHJcbiAgICB2YXIgZmlsbGVyTW9kZWwgPSBnZXRPckNyZWF0ZU1vZGVsRmlsbGVycyhtb25nb29zZSk7XHJcbiAgICByZXR1cm4gZmlsbGVyTW9kZWwuZmluZCh7fSkubGVhbigpLmV4ZWMoKS50aGVuKCAodmFscyA6IGFueVtdKSA9PiB7XHJcbiAgICAgICAgaWYodmFscy5sZW5ndGggIT09IDEpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3RlZCBleGFjdGx5IG9uZSBvcGVyYXRvcnMgZW50cnkgJyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gdmFsc1swXTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE9wZXJhdG9yc0Zyb21EQiggbW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSkgOiBQcm9taXNlPGFueT4ge1xyXG4gICAgdmFyIG9wZXJhdG9yTW9kZWwgPSBnZXRPckNyZWF0ZU1vZGVsT3BlcmF0b3JzKG1vbmdvb3NlKTtcclxuICAgIHJldHVybiBvcGVyYXRvck1vZGVsLmZpbmQoe30pLmxlYW4oKS5leGVjKCkudGhlbiggKHZhbHMgOiBhbnlbXSkgPT4ge1xyXG4gICAgICAgIGlmKHZhbHMubGVuZ3RoICE9PSAxKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignZXhwZWN0ZWQgZXhhY3RseSBvbmUgb3BlcmF0b3JzIGVudHJ5ICcpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHZhbHNbMF07XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuZFNjaGVtYURvY0Zyb21EQihtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlLCBtb2RlbE5hbWUgOiBzdHJpbmcpIDogUHJvbWlzZTxJRXh0ZW5kZWRTY2hlbWE+IHtcclxuICAgIHZhciBtb25nb29zZU1vZGVsTmFtZSA9IG1ha2VNb25nb29zZU1vZGVsTmFtZShtb2RlbE5hbWUpO1xyXG4gICAgdmFyIG1vZGVsX0VTID0gbW9uZ29vc2UubW9kZWwoTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICB2YXIgcmVzID0gbW9kZWxfRVMuZmluZCh7IG1vZGVsbmFtZSA6IG1vZGVsTmFtZX0pLmxlYW4oKS5leGVjKCkudGhlbigoZG9jKSA9PlxyXG4gICAgeyAgIGRlYnVnbG9nKCAoKT0+IGAgbG9hZGVkIEVzIGRvYyAke21vZGVsTmFtZX0gcmV0dXJuZWQgJHsoZG9jIGFzIGFueSkubGVuZ3RofSBkb2N1cyBmcm9tIGRiIDogYFxyXG4gICAgICAgICsgKGRvYyBhcyBhbnkpWzBdLm1vZGVsbmFtZSArIGBgICsgKGRvYyBhcyBhbnkpWzBdLmNvbGxlY3Rpb25uYW1lICk7XHJcbiAgICAgICAgZGVidWdsb2coKCkgPT4gJ2hlcmUgdGhlIHJlc3VsdCcgKyBKU09OLnN0cmluZ2lmeShkb2MpKTtcclxuICAgICAgICBpZigoZG9jIGFzIGFueSkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdNb2RlbCAnICsgbW9kZWxOYW1lICsgJyBpcyBub3QgcHJlc2VudCBpbiAnICsgTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBkb2NbMF07XHJcbiAgICB9KTtcclxuICAgIC8vY29uc29sZS5sb2coJ3JlcycgKyB0eXBlb2YgcmVzKTtcclxuICAgIHJldHVybiByZXM7XHJcbiAvLyAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnbW9kZWwgJyArIG1vZGVsTmFtZSArICcgY2Fubm90IGJlIGZvdW5kIG9uIGRiJyk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxEb2NGcm9tREIobW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSwgbW9kZWxOYW1lIDogc3RyaW5nKSA6IFByb21pc2U8SU1vZGVsRG9jPiB7XHJcbiAgICB2YXIgbW9uZ29vc2VNb2RlbE5hbWUgPSBtYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxOYW1lKTtcclxuICAgIHZhciBtb2RlbF9FUyA9IG1vbmdvb3NlLm1vZGVsKE1vbmdvb3NlTkxRLk1PTkdPT1NFX01PREVMTkFNRV9FWFRFTkRFRFNDSEVNQVMpO1xyXG4gICAgcmV0dXJuIG1ha2VNb2RlbEZyb21EQihtb25nb29zZSwgTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFMpLnRoZW4oXHJcbiAgICAgICAgKG1vZGVsKSA9PiBtb2RlbC5maW5kKHsgbW9kZWxuYW1lIDogbW9kZWxOYW1lfSkubGVhbigpLmV4ZWMoKVxyXG4gICAgKS50aGVuKChkb2MpID0+XHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZyggKCk9PiAnIGxvYWRlZCBNb2RlbCBkb2MgJHttb2RlbE5hbWV9IHJldHVybmVkICR7KGRvYyBhcyBhbnkpLmxlbmd0aH0gZG9jdXMgZnJvbSBkYiA6ICdcclxuICAgICAgICAgICAgKyAoZG9jIGFzIGFueSlbMF0ubW9kZWxuYW1lICsgYCBgICsgKGRvYyBhcyBhbnkpWzBdLmNvbGxlY3Rpb25uYW1lICk7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKCdoZXJlIHRoZSByZXN1bHQnICsgSlNPTi5zdHJpbmdpZnkoZG9jKSk7XHJcbiAgICAgICAgICAgIGlmKChkb2MgYXMgYW55KS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKCdNb2RlbCAnICsgbW9kZWxOYW1lICsgJyBpcyBub3QgcHJlc2VudCBpbiAnICsgTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGRvY1swXTtcclxuICAgICAgICB9XHJcbiAgICApO1xyXG4gLy8gICByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ21vZGVsICcgKyBtb2RlbE5hbWUgKyAnIGNhbm5vdCBiZSBmb3VuZCBvbiBkYicpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWFrZU1vZGVsRnJvbURCKG1vbmdvb3NlIDogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVsTmFtZSA6IHN0cmluZykgOiBQcm9taXNlPG1vbmdvb3NlLk1vZGVsPGFueT4+IHtcclxuICAgIHZhciBtb25nb29zZU1vZGVsTmFtZSA9IG1ha2VNb25nb29zZU1vZGVsTmFtZShtb2RlbE5hbWUpO1xyXG4gICAgaWYobW9uZ29vc2UubW9kZWxOYW1lcygpLmluZGV4T2YobW9uZ29vc2VNb2RlbE5hbWUpID49IDApIHtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG1vbmdvb3NlLm1vZGVsKG1vbmdvb3NlTW9kZWxOYW1lKSk7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyggKCk9PidoZXJlIHByZXNlbnQgbW9kZWxuYW1lczogJyArIG1vbmdvb3NlLm1vZGVsTmFtZXMoKS5qb2luKCdcXG4nKSk7XHJcbiAgICB2YXIgbW9kZWxfRVMgPSBtb25nb29zZS5tb2RlbChNb25nb29zZU5MUS5NT05HT09TRV9NT0RFTE5BTUVfRVhURU5ERURTQ0hFTUFTKTtcclxuICAgIGRlYnVnbG9nKCAoKT0+J2hlcmUgbW9kZWxuYW1lOicgKyBtb2RlbE5hbWUpO1xyXG4gICAgdmFyIHJlcyA9IG1vZGVsX0VTLmZpbmQoeyBtb2RlbG5hbWUgOiBtb2RlbE5hbWV9KS5sZWFuKCkuZXhlYygpLnRoZW4oKGRvYykgPT5cclxuICAgIHsgIGRlYnVnbG9nKCAoKT0+YCBsb2FkZWQgTW9kZWwgZG9jICR7bW9kZWxOYW1lfSByZXR1cm5lZCAkeyhkb2MgYXMgYW55KS5sZW5ndGh9IGRvY3VzIGZyb20gZGIgOiBgXHJcbiAgICAgICAgICAgICsgKGRvYyBhcyBhbnkpWzBdLm1vZGVsbmFtZSArIGAgYCArIChkb2MgYXMgYW55KVswXS5jb2xsZWN0aW9ubmFtZSApO1xyXG4gICAgICAgIGRlYnVnbG9nKCAoKT0+J2hlcmUgdGhlIHJlc3VsdCcgKyBKU09OLnN0cmluZ2lmeShkb2MpKTtcclxuICAgICAgICBpZigoZG9jIGFzIGFueSkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdNb2RlbCAnICsgbW9kZWxOYW1lICsgJyBpcyBub3QgcHJlc2VudCBpbiAnICsgTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlYnVnbG9nKCgpPT4gJ2NyZWF0aW5nIHNjaGVtYSBmb3IgJyArIG1vZGVsTmFtZSArICcgZnJvbSAnKTtcclxuICAgICAgICAvLyAgKyBKU09OLnN0cmluZ2lmeShkb2NbMF0pKTtcclxuXHJcbiAgICAgICAgdmFyIHNjaGVtYSA9IG1ha2VNb25nb29zZVNjaGVtYShkb2NbMF0gYXMgSUV4dGVuZGVkU2NoZW1hLG1vbmdvb3NlKTtcclxuICAgICAgICBpZihtb25nb29zZS5tb2RlbE5hbWVzKCkuaW5kZXhPZihtb25nb29zZU1vZGVsTmFtZSkgPj0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG1vbmdvb3NlLm1vZGVsKG1vbmdvb3NlTW9kZWxOYW1lKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKCcgbW9vbmdvb3NlTW9kZWxOYW1lIDogJyArIG1vbmdvb3NlTW9kZWxOYW1lICsgJyAnICsgbW9kZWxOYW1lICk7XHJcbiAgICAgICAgdmFyIG1vZGVsID0gbW9uZ29vc2UubW9kZWwobW9uZ29vc2VNb2RlbE5hbWUsIHNjaGVtYSk7XHJcbiAgICAgICAgZGVidWdsb2coICgpPT4gJ3JldHVybmluZyBtb2RlbDogJyArIG1vZGVsTmFtZSArIGAgYCsgdHlwZW9mIG1vZGVsKTtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG1vZGVsKTtcclxuICAgIH0pO1xyXG4gICAgLy9jb25zb2xlLmxvZygncmVzJyArIHR5cGVvZiByZXMpO1xyXG4gICAgcmV0dXJuIHJlcztcclxuIC8vICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdtb2RlbCAnICsgbW9kZWxOYW1lICsgJyBjYW5ub3QgYmUgZm91bmQgb24gZGInKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVwbG9hZEZpbGxlcnMobW9uZ29vc2U6IG1vbmdvb3NlLk1vbmdvb3NlLCBtb2RlbFBhdGg6IHN0cmluZykgOiBQcm9taXNlPGFueT4ge1xyXG4gICAgdmFyIG1vZGVsRmlsbGVyID0gZ2V0T3JDcmVhdGVNb2RlbEZpbGxlcnMobW9uZ29vc2UpO1xyXG4gICAgcmV0dXJuIG1vZGVsRmlsbGVyLmRlbGV0ZU1hbnkoe30pLnRoZW4oKCkgPT4ge1xyXG4gICAgdmFyIGZpbGxlcnMgPSBGVXRpbHMucmVhZEZpbGVBc0pTT04obW9kZWxQYXRoICsgJy9maWxsZXIuanNvbicpO1xyXG4gICAgICAgIHJldHVybiBuZXcgbW9kZWxGaWxsZXIoeyBmaWxsZXJzOiBmaWxsZXJzfSkuc2F2ZSgpO1xyXG4gICAgfSk7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHVwbG9hZE9wZXJhdG9ycyhtb25nb29zZTogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVsUGF0aDogc3RyaW5nKSA6IFByb21pc2U8YW55PiB7XHJcbiAgICB2YXIgbW9kZWxGaWxsZXIgPSBnZXRPckNyZWF0ZU1vZGVsT3BlcmF0b3JzKG1vbmdvb3NlKTtcclxuICAgIHJldHVybiBtb2RlbEZpbGxlci5kZWxldGVNYW55KHt9KS50aGVuKCgpID0+IHtcclxuICAgIHZhciBvcGVyYXRvcnMgPSBGVXRpbHMucmVhZEZpbGVBc0pTT04obW9kZWxQYXRoICsgJy9vcGVyYXRvcnMuanNvbicpO1xyXG4gICAgcmV0dXJuIG5ldyBtb2RlbEZpbGxlcihvcGVyYXRvcnMpLnNhdmUoKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogVXBsb2FkcyB0aGUgY29tcGxldGUgbW9kZWwgKG1ldGFkYXRhISkgaW5mb3JtYXRpb25cclxuICogQXNzdW1lcyBtZXRhbW9kZWwgaGFzIGJlZW4gbG9hZGVkIChzZWUgI3Vwc2VydE1ldGFNb2RlbHMpXHJcbiAqIEBwYXJhbSBtb25nb29zZSB7bW9uZ29vc2UuTW9uZ29vc2V9IHRoZSBtb25nb29zZSBoYW5kbGVcclxuICogQHBhcmFtIG1vZGVscGF0aCB7c3RyaW5nfSAgdGhlIG1vZGVsIHBhdGhcclxuICogQHJldHVybiBQcm9taXNlPGFueT4gdGhlICBwcm9taXNlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdXBzZXJ0TW9kZWxzKG1vbmdvb3NlIDogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVscGF0aDogc3RyaW5nKSAgOiBQcm9taXNlPGFueT4ge1xyXG4gICAgZGVidWdsb2coKCk9PiBgbW9kZWxwYXRoICR7bW9kZWxwYXRofSBgKTtcclxuICAgIHZhciBtb2RlbE5hbWVzID0gbG9hZE1vZGVsTmFtZXMobW9kZWxwYXRoKTtcclxuICAgIHZhciBtb2RlbF9FUyA9IG1vbmdvb3NlLm1vZGVsKE1vbmdvb3NlTkxRLk1PTkdPT1NFX01PREVMTkFNRV9FWFRFTkRFRFNDSEVNQVMpO1xyXG4gICAgdmFyIG1vZGVsX0RvYyA9IG1vbmdvb3NlLm1vZGVsKE1vbmdvb3NlTkxRLk1PTkdPT1NFX01PREVMTkFNRV9NRVRBTU9ERUxTKTtcclxuICAgIGRlYnVnbG9nKCdoZXJlIG1vZGVsbmFtZXMgJyArIG1vZGVsTmFtZXMpO1xyXG4gICAgcmV0dXJuIHJlbW92ZU90aGVycyhtb25nb29zZSwgbW9kZWxfRVMsIFtNb25nb05MUS5NT0RFTE5BTUVfTUVUQU1PREVMU10gKS50aGVuKCAoKT0+XHJcbiAgICAgICAgUHJvbWlzZS5hbGwobW9kZWxOYW1lcy5tYXAoIChtb2RlbE5hbWUpID0+IHtcclxuICAgICAgICAgICAgZGVidWdsb2coJ3Vwc2VydGluZyAgJyArIG1vZGVsTmFtZSk7XHJcbiAgICAgICAgICAgIHZhciBtb2RlbERvYyA9IGxvYWRNb2RlbERvYyhtb2RlbHBhdGgsIG1vZGVsTmFtZSk7XHJcbiAgICAgICAgICAgIHZhciBzY2hlbWFTZXIgPSBsb2FkRXh0ZW5kZWRNb25nb29zZVNjaGVtYShtb2RlbHBhdGgsIG1vZGVsTmFtZSk7XHJcbiAgICAgICAgICAgIHZhciBzY2hlbWFGdWxsID0gYXVnbWVudE1vbmdvb3NlU2NoZW1hKG1vZGVsRG9jLCBzY2hlbWFTZXIpO1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZyhgdXBzZXJ0aW5nIGVzY2hlbWEgJHttb2RlbE5hbWV9ICB3aXRoIG1vZGVsRG9jYCArIEpTT04uc3RyaW5naWZ5KHNjaGVtYUZ1bGwpKTtcclxuICAgICAgICAgICAgdmFyIHAxID0gbW9kZWxfRVMuZmluZE9uZUFuZFVwZGF0ZSggeyBtb2RlbG5hbWUgOiBtb2RlbE5hbWUgfSwgc2NoZW1hRnVsbCwge1xyXG4gICAgICAgICAgICAgICAgdXBzZXJ0IDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZGVidWdsb2coYHVwc2VydGluZyBtb2RlbCAke21vZGVsTmFtZX0gIHdpdGggbW9kZWxEb2NgICsgSlNPTi5zdHJpbmdpZnkobW9kZWxEb2MpKTtcclxuICAgICAgICAgICAgdmFyIHAyID0gbW9kZWxfRG9jLmZpbmRPbmVBbmRVcGRhdGUoIHsgbW9kZWxuYW1lIDogbW9kZWxOYW1lIH0sIG1vZGVsRG9jLCB7XHJcbiAgICAgICAgICAgICAgICB1cHNlcnQgOiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW3AxLHAyXSk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICApXHJcbiAgICApLnRoZW4oICgpID0+IHtcclxuICAgICAgICB2YXIgbW9kZWxOYW1lc0V4dGVuZGVkID0gbW9kZWxOYW1lcy5zbGljZSgpO1xyXG4gICAgICAgIG1vZGVsTmFtZXNFeHRlbmRlZC5wdXNoKE1vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTKTtcclxuICAgICAgICBkZWJ1Z2xvZygncmVtb3Zpbmcgc3B1cmlvdXMgbW9kZWxzJyk7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtcclxuICAgICAgICAgICAgcmVtb3ZlT3RoZXJzKG1vbmdvb3NlLCBtb2RlbF9FUywgbW9kZWxOYW1lc0V4dGVuZGVkICksXHJcbiAgICAgICAgICAgIHJlbW92ZU90aGVycyhtb25nb29zZSwgbW9kZWxfRG9jLCBtb2RlbE5hbWVzRXh0ZW5kZWQgKVxyXG4gICAgICAgIF0pO1xyXG4gICAgfSkudGhlbiggKCkgPT4ge1xyXG4gICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xyXG4gICAgICAgICAgICB1cGxvYWRGaWxsZXJzKG1vbmdvb3NlLG1vZGVscGF0aCksXHJcbiAgICAgICAgICAgIHVwbG9hZE9wZXJhdG9ycyhtb25nb29zZSwgbW9kZWxwYXRoKVxyXG4gICAgICAgICBdKVxyXG4gICAgfSlcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGhhc01ldGFDb2xsZWN0aW9uKG1vbmdvb3NlIDogYW55KSA6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIG1vbmdvb3NlLmNvbm5lY3Rpb24uZGIubGlzdENvbGxlY3Rpb25zKCkudG9BcnJheSgoZXJyICxuYW1lcyApID0+XHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZihlcnIpIHtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmKG5hbWVzLmluZGV4T2YoTW9uZ29OTFEuQ09MTF9NRVRBTU9ERUxTKSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlamVjdChcImRvbWFpbiBub3QgbG9hZGVkXCIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBNb25nb05MUSA9IHtcclxuICAgIE1PREVMTkFNRV9NRVRBTU9ERUxTIDogXCJtZXRhbW9kZWxzXCIsXHJcbiAgICBDT0xMX01FVEFNT0RFTFMgOiBcIm1ldGFtb2RlbHNcIixcclxuICAgIENPTExfRVhURU5ERURTQ0hFTUFTIDogXCJtb25nb25scV9lc2NoZW1hc1wiXHJcbn07XHJcblxyXG5cclxuZXhwb3J0IGNvbnN0IE1vbmdvb3NlTkxRID0ge1xyXG4gICAgTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyA6IG1ha2VNb25nb29zZU1vZGVsTmFtZShNb25nb05MUS5DT0xMX0VYVEVOREVEU0NIRU1BUyksXHJcbiAgICBNT05HT09TRV9NT0RFTE5BTUVfTUVUQU1PREVMUyA6IG1ha2VNb25nb29zZU1vZGVsTmFtZShNb25nb05MUS5DT0xMX01FVEFNT0RFTFMpXHJcbn07XHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbFJlY0J5TW9kZWxOYW1lKG1vbmdvb3NlIDogYW55LCBtb2RlbFBhdGg6IHN0cmluZywgbW9kZWxOYW1lIDogc3RyaW5nKSA6IFByb21pc2U8SU1vZGVsUmVjPiAge1xyXG4gICAgLy8gZG8gd2UgaGF2ZSB0aGUgbWV0YSBjb2xsZWN0aW9uIGluIHRoZSBkYj9cclxuICAgIHJldHVybiBQcm9taXNlLmFsbChbXHJcbiAgICAgICAgbW9uZ29vc2UuY29ubmVjdGlvbi5kYltNb25nb05MUS5DT0xMX01FVEFNT0RFTFNdLmZpbmQoeyBtb2RlbE5hbWUgOiBtb2RlbE5hbWV9KSxcclxuICAgICAgICBtb25nb29zZS5jb25uZWN0aW9uLmRiW01vbmdvTkxRLkNPTExfRVhURU5ERURTQ0hFTUFTXS5maW5kKHsgbW9kZWxOYW1lIDogbW9kZWxOYW1lfSlcclxuICAgIF0pLnRoZW4ocmVzID0+IHtcclxuICAgICAgICB2YXIgbW9kZWxEb2MgPSByZXNbMF07XHJcbiAgICAgICAgdmFyIGV4dGVuZGVkU2NoZW1hID0gcmVzWzFdO1xyXG4gICAgICAgIHZhciBzY2hlbWEgPSBtYWtlTW9uZ29vc2VTY2hlbWEoZXh0ZW5kZWRTY2hlbWEpO1xyXG4gICAgICAgIHZhciBtb2RlbCA9IG1vbmdvb3NlLm1vZGVsKG1vZGVsRG9jLmNvbGxlY3Rpb25OYW1lLCBzY2hlbWEpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNvbGxlY3Rpb25OYW1lIDogbW9kZWxEb2MuY29sbGVjdGlvbk5hbWUsXHJcbiAgICAgICAgICAgIG1vZGVsRG9jIDogbW9kZWxEb2MsXHJcbiAgICAgICAgICAgIHNjaGVtYSA6IG1ha2VNb25nb29zZVNjaGVtYShleHRlbmRlZFNjaGVtYSksXHJcbiAgICAgICAgICAgIG1vZGVsIDogbW9kZWxcclxuICAgICAgICB9IGFzIElNb2RlbFJlYztcclxuICAgIH0pO1xyXG59XHJcbiovXHJcblxyXG4vKlxyXG4gICAgaGFzTWV0YUNvbGxlY3Rpb24obW9uZ29vc2UpLnRoZW4oICgpID0+IHtcclxuICAgICAgICBtb25nb29zZS5jb25uZWN0aW9uLmRiLm1nbmxxX2RvbWFpbnMuZmluZCgge1xyXG4gICAgICAgICAgICBtb2RlbE5hbWUgOiBtb2RlbE5hbWVcclxuICAgICAgICB9KS50aGVuKCBkb2MgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZG9jLnNjaGVtYSlcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgbW9uZ29vc2UuY29ubmVjdGlvbi5kYi5saXN0Q29sbGVjdGlvbnMoKS50b0FycmF5KChlcnIgLG5hbWVzICkgPT5cclxuICAgIHtcclxuICAgICAgICBpZihuYW1lcy5pbmRleE9mKFwibWdubHFfZG9tYWluc1wiKSA+PSAwKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcbiovXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlRG9jTW9uZ29vc2UobW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSwgY29sbGVjdGlvbm5hbWUsIHNjaGVtYSA6IG1vbmdvb3NlLlNjaGVtYSwgZG9jIDogYW55ICkge1xyXG4gICAgdmFyIERvY01vZGVsO1xyXG4gICAgLy9jb25zb2xlLmxvZygnc2NoZW1hICcgKyBKU09OLnN0cmluZ2lmeShzY2hlbWEpKTtcclxuICAgIGlmKG1vbmdvb3NlLm1vZGVsTmFtZXMoKS5pbmRleE9mKGNvbGxlY3Rpb25uYW1lKSA+PSAwKSB7XHJcbiAgICAgICAgRG9jTW9kZWwgPSBtb25nb29zZS5tb2RlbChjb2xsZWN0aW9ubmFtZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIERvY01vZGVsID0gbW9uZ29vc2UubW9kZWwoY29sbGVjdGlvbm5hbWUsIHNjaGVtYSk7XHJcblxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbGlkYXRlRG9jVnNNb25nb29zZU1vZGVsKERvY01vZGVsLCBkb2MpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVEb2NWc01vbmdvb3NlTW9kZWwobW9kZWwsIGRvYyA6IGFueSkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPGFueT4oKHJlc29sdmUscmVqZWN0KSA9PiB7XHJcbiAgICAgICAgdmFyIHRoZURvYyA9IG5ldyBtb2RlbChkb2MpO1xyXG4gICAgICAgIHRoZURvYy52YWxpZGF0ZSgoZXJyKSA9PiAge1xyXG4gICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGVycik7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZXNvbHZlKHRoZURvYyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZURvYyhjb2xsZWN0aW9ubmFtZTogc3RyaW5nLCBzY2hlbWEgOiBtb25nb29zZS5TY2hlbWEsIGRvYyA6IGFueSkge1xyXG4gIHZhciBqc29uU2NoZW1hUiA9IChzY2hlbWEgYXMgYW55KS5qc29uU2NoZW1hKCk7XHJcbiAgdmFyIGpzb25TY2hlbWEgPSBfLmNsb25lRGVlcChqc29uU2NoZW1hUik7XHJcbiAgdHJhdmVyc2VFeGVjdXRpbmcoanNvblNjaGVtYSwgZnVuY3Rpb24ob2JqLHZhbCxrZXkpIHtcclxuICAgIGlmKGtleSA9PT0gJ3Byb3BlcnRpZXMnICYmIG9iai50eXBlID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coJ2F1Z21lbnRpbmcgc2NoZW1hJyk7XHJcbiAgICAgICAgb2JqLmFkZGl0aW9uYWxQcm9wZXJ0aWVzID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIGRlYnVnbG9nKCgpPT4gYCBoZXJlIGpzb24gc2NoZW1hIGAgKyAoSlNPTi5zdHJpbmdpZnkoanNvblNjaGVtYSx1bmRlZmluZWQsMikpKTtcclxuICB2YXIgVmFsaWRhdG9yID0gcmVxdWlyZSgnanNvbnNjaGVtYScpLlZhbGlkYXRvcjtcclxuICB2YXIgdiA9IG5ldyBWYWxpZGF0b3IoKTtcclxuICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGpzb25TY2hlbWEsdW5kZWZpbmVkLDIpKTtcclxuICB2YXIgdmFscmVzdWx0ID0gdi52YWxpZGF0ZShkb2MsanNvblNjaGVtYSk7XHJcbiAgaWYodmFscmVzdWx0LmVycm9ycy5sZW5ndGgpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2NoZW1hIHZhbGlkYXRpbmcgYWdhaW5zdCBKU09OIFNjaGVtYSBmYWlsZWQgOiBcIiArIEpTT04uc3RyaW5naWZ5KHZhbHJlc3VsdC5lcnJvcnMsdW5kZWZpbmVkLDIpKTtcclxuICB9XHJcbiAgcmV0dXJuIHRydWU7XHJcbn0iXX0=

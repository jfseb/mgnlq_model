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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tb2RlbGxvYWQvc2NoZW1hbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBRUgsb0NBQW9DO0FBQ3BDLGdDQUFnQztBQUVoQyxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7QUFTbkMseUNBQXlDO0FBRXpDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMsbUNBQW1DO0FBQ25DLDRCQUE0QjtBQUM1QixxQ0FBcUM7QUFFcEMsUUFBZ0IsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUUzQzs7R0FFRztBQUNILE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hEOztHQUVHO0FBQ0gsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLHVDQUF1QyxDQUFDO0FBRTVGLFNBQWdCLFFBQVEsQ0FBQyxDQUFlLEVBQUUsQ0FBZTtJQUN2RCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRkQsNEJBRUM7QUFLRCxNQUFNLG9CQUFvQixHQUFHO0lBQ3pCLFdBQVcsRUFBRTtRQUNYLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcsSUFBSTtLQUNsQjtJQUNELFFBQVEsRUFBRTtRQUNSLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcsSUFBSTtLQUNsQjtJQUNELG1CQUFtQixFQUFFO1FBQ25CLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcsSUFBSTtLQUNsQjtJQUNELGdCQUFnQixFQUFFO1FBQ2hCLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixVQUFVLEVBQUcs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VyxHQUFJLE1BQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUMvQyxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxVQUFTLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRztRQUNoRCxJQUFHLEdBQUcsS0FBSyxZQUFZLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7WUFDOUMsbUNBQW1DO1lBQ25DLEdBQUcsQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUM7U0FDcEM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFFLEVBQUUsQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0UsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUNoRCxJQUFJLENBQUMsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO0lBQ3hCLHNEQUFzRDtJQUN0RCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBQyxVQUFVLENBQUMsQ0FBQztJQUMzQyxJQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1FBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3JIO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBbkJELGtDQW1CQyIsImZpbGUiOiJtb2RlbGxvYWQvc2NoZW1hbG9hZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBGdW5jdGlvbmFsaXR5IG1hbmFnaW5nIHRoZSBtYXRjaCBtb2RlbHNcclxuICpcclxuICogQGZpbGVcclxuICovXHJcblxyXG4vL2ltcG9ydCAqIGFzIGludGYgZnJvbSAnY29uc3RhbnRzJztcclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWdmJztcclxuXHJcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdzY2hlbWFsb2FkJyk7XHJcblxyXG4vL2NvbnN0IGxvYWRsb2cgPSBsb2dnZXIubG9nZ2VyKCdtb2RlbGxvYWQnLCAnJyk7XHJcblxyXG5pbXBvcnQgKiAgYXMgSU1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG4vL2ltcG9ydCAqIGFzIElucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi4vbWF0Y2gvcnVsZSc7XHJcbi8vaW1wb3J0ICogYXMgVG9vbHMgZnJvbSAnLi4vbWF0Y2gvdG9vbHMnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIE1ldGEgZnJvbSAnLi4vbW9kZWwvbWV0YSc7XHJcbmltcG9ydCAqIGFzIEZVdGlscyBmcm9tICcuLi9tb2RlbC9tb2RlbCc7XHJcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJ2Fib3RfdXRpbHMnO1xyXG4vL2ltcG9ydCAqIGFzIENpcmN1bGFyU2VyIGZyb20gJ2Fib3RfdXRpbHMnO1xyXG4vL2ltcG9ydCAqIGFzIERpc3RhbmNlIGZyb20gJ2Fib3Rfc3RyaW5nZGlzdCc7XHJcbmltcG9ydCAqIGFzIHByb2Nlc3MgZnJvbSAncHJvY2Vzcyc7XHJcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcclxuaW1wb3J0ICogYXMgbW9uZ29vc2UgZnJvbSAnbW9uZ29vc2UnO1xyXG5cclxuKG1vbmdvb3NlIGFzIGFueSkuUHJvbWlzZSA9IGdsb2JhbC5Qcm9taXNlO1xyXG5cclxuLyoqXHJcbiAqIFdBVENIIG91dCwgdGhpcyBpbnN0cnVtZW50cyBtb25nb29zZSFcclxuICovXHJcbnJlcXVpcmUoJ21vbmdvb3NlLXNjaGVtYS1qc29uc2NoZW1hJykobW9uZ29vc2UpO1xyXG4vKipcclxuICogdGhlIG1vZGVsIHBhdGgsIG1heSBiZSBjb250cm9sbGVkIHZpYSBlbnZpcm9ubWVudCB2YXJpYWJsZVxyXG4gKi9cclxudmFyIGVudk1vZGVsUGF0aCA9IHByb2Nlc3MuZW52W1wiQUJPVF9NT0RFTFBBVEhcIl0gfHwgXCJub2RlX21vZHVsZXMvYWJvdF90ZXN0bW9kZWwvdGVzdG1vZGVsXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY21wVG9vbHMoYTogSU1hdGNoLklUb29sLCBiOiBJTWF0Y2guSVRvb2wpIHtcclxuICByZXR1cm4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKTtcclxufVxyXG5cclxuXHJcbnR5cGUgSU1vZGVsID0gSU1hdGNoLklNb2RlbDtcclxuXHJcbmNvbnN0IEV4dGVuZGVkU2NoZW1hX3Byb3BzID0ge1xyXG4gICAgXCJtb2RlbG5hbWVcIjoge1xyXG4gICAgICBcInR5cGVcIjogU3RyaW5nLFxyXG4gICAgICBcInRyaW1cIjogdHJ1ZSxcclxuICAgICAgXCJyZXF1aXJlZFwiIDogdHJ1ZVxyXG4gICAgfSxcclxuICAgIFwiZG9tYWluXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFN0cmluZyxcclxuICAgICAgXCJ0cmltXCI6IHRydWUsXHJcbiAgICAgIFwicmVxdWlyZWRcIiA6IHRydWVcclxuICAgIH0sXHJcbiAgICBcIm1vbmdvb3NlbW9kZWxuYW1lXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFN0cmluZyxcclxuICAgICAgXCJ0cmltXCI6IHRydWUsXHJcbiAgICAgIFwicmVxdWlyZWRcIiA6IHRydWVcclxuICAgIH0sXHJcbiAgICBcImNvbGxlY3Rpb25uYW1lXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFN0cmluZyxcclxuICAgICAgXCJ0cmltXCI6IHRydWUsXHJcbiAgICAgIFwicmVxdWlyZWRcIiA6IHRydWVcclxuICAgIH0sXHJcbiAgICBcInByb3BzXCIgOiB7fSxcclxuICAgIFwiaW5kZXhcIiA6IHt9XHJcbn07XHJcbmNvbnN0IEV4dGVuZGVkU2NoZW1hX2luZGV4ID0ge1xyXG4gICAgXCJtb2RlbG5hbWVcIiA6IFwidGV4dFwiXHJcbn07XHJcblxyXG5cclxuXHJcbi8vIGxvYWQgdGhlIG1vZGVsc1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRNb2RlbE5hbWVzKG1vZGVsUGF0aCA6IHN0cmluZykgOiBzdHJpbmdbXSB7XHJcbiAgbW9kZWxQYXRoID0gbW9kZWxQYXRoIHx8IGVudk1vZGVsUGF0aDtcclxuICBkZWJ1Z2xvZygoKT0+IGBtb2RlbHBhdGggaXMgJHttb2RlbFBhdGh9IGApO1xyXG4gIHZhciBtZGxzID0gRlV0aWxzLnJlYWRGaWxlQXNKU09OKG1vZGVsUGF0aCArICcvbW9kZWxzLmpzb24nKTtcclxuICBtZGxzLmZvckVhY2gobmFtZSA9PiB7XHJcbiAgICBpZihuYW1lICE9PSBtYWtlTW9uZ29Db2xsZWN0aW9uTmFtZShuYW1lKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIG1vZGVsbmFtZSwgbXVzdCB0ZXJtaW5hdGUgd2l0aCBzIGFuZCBiZSBsb3dlcmNhc2UnKTtcclxuICAgIH1cclxuICB9KVxyXG4gIHJldHVybiBtZGxzO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElSYXdTY2hlbWEge1xyXG4gICAgcHJvcHM6IGFueVtdLFxyXG4gICAgaW5kZXggOiBhbnlcclxufVxyXG5cclxuLypcclxuZXhwb3J0IGludGVyZmFjZSBJTW9kZWxEb2NDYXRlZ29yeVJlYyB7XHJcbiAgICBjYXRlZ29yeSA6IHN0cmluZyxcclxuICAgIGNhdGVnb3J5X2Rlc2NyaXB0aW9uIDogc3RyaW5nLFxyXG4gICAgUUJFQ29sdW1uUHJvcHMgOiB7XHJcbiAgICAgICAgXCJkZWZhdWx0V2lkdGhcIjogbnVtYmVyLFxyXG4gICAgICAgIFwiUUJFXCI6IGJvb2xlYW4sXHJcbiAgICAgICAgXCJMVU5SSW5kZXhcIjogYm9vbGVhblxyXG4gICAgICB9LFxyXG4gICAgICBcImNhdGVnb3J5X3N5bm9ueW1zXCI6IHN0cmluZ1tdLFxyXG4gICAgd29yZGluZGV4IDogYm9vbGVhbixcclxuICAgIGV4YWN0bWF0Y2g6IGJvb2xlYW4sXHJcbiAgICBzaG93TVxyXG59O1xyXG4qL1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJTW9kZWxEb2Mge1xyXG4gICAgZG9tYWluIDogc3RyaW5nLFxyXG4gICAgbW9kZWxuYW1lPyA6IHN0cmluZyxcclxuICAgIGNvbGxlY3Rpb25uYW1lPyA6IHN0cmluZyxcclxuICAgIGRvbWFpbl9kZXNjcmlwdGlvbiA6IHN0cmluZ1xyXG4gICAgX2NhdGVnb3JpZXMgOiBJTWF0Y2guSU1vZGVsQ2F0ZWdvcnlSZWNbXSxcclxuICAgIGNvbHVtbnM6IHN0cmluZ1tdLFxyXG4gICAgZG9tYWluX3N5bm9ueW1zIDogc3RyaW5nW11cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUV4dGVuZGVkU2NoZW1hIGV4dGVuZHMgSVJhd1NjaGVtYXtcclxuICAgIGRvbWFpbiA6IHN0cmluZyxcclxuICAgIG1vZGVsbmFtZSA6IHN0cmluZyxcclxuICAgIG1vbmdvb3NlbW9kZWxuYW1lIDogc3RyaW5nLFxyXG4gICAgY29sbGVjdGlvbm5hbWUgOiBzdHJpbmdcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXBUeXBlKHZhbCA6IHN0cmluZykgOiBhbnkge1xyXG4gICAgaWYodmFsID09PSBcIlN0cmluZ1wiKSB7XHJcbiAgICAgICAgcmV0dXJuIFN0cmluZztcclxuICAgIH1cclxuICAgIGlmKHZhbCA9PT0gXCJCb29sZWFuXCIpIHtcclxuICAgICAgICByZXR1cm4gQm9vbGVhbjtcclxuICAgIH1cclxuICAgIGlmKHZhbCA9PT0gXCJOdW1iZXJcIikge1xyXG4gICAgICAgIHJldHVybiBOdW1iZXI7XHJcbiAgICB9XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCIgaWxsZWdhbCB0eXBlIFwiICsgdmFsICsgXCIgZXhwZWN0ZWQgU3RyaW5nLCBCb29sZWFuLCBOdW1iZXIsIC4uLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlcGxhY2VJZlR5cGVEZWxldGVNKG9iaiA6IGFueSwgdmFsIDogYW55LCBrZXkgOiBzdHJpbmcpIHtcclxuICAgIGlmKGtleS5zdWJzdHIoMCwzKSA9PT0gXCJfbV9cIikge1xyXG4gICAgICAgIGRlbGV0ZSBvYmpba2V5XTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9O1xyXG4gICAgaWYoa2V5ID09PSBcInR5cGVcIiAmJiB0eXBlb2YgdmFsID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgdmFyIHIgPSBtYXBUeXBlKHZhbCk7XHJcbiAgICAgICAgb2JqW2tleV0gPSByO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cmF2ZXJzZUV4ZWN1dGluZyhvYmosIGZuICkge1xyXG4gICAgXy5mb3JJbihvYmosIGZ1bmN0aW9uICh2YWwsIGtleSkge1xyXG4gICAgLy8gICAgY29uc29sZS5sb2codmFsICsgXCIgLT4gXCIgKyBrZXkgKyBcIiBcIik7XHJcbiAgICAgICAgZm4ob2JqLHZhbCxrZXkpO1xyXG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsKSkge1xyXG4gICAgICAgICAgICB2YWwuZm9yRWFjaChmdW5jdGlvbihlbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNPYmplY3QoZWwpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2VFeGVjdXRpbmcoZWwsZm4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKF8uaXNPYmplY3QodmFsKSkge1xyXG4gICAgICAgICAgICB0cmF2ZXJzZUV4ZWN1dGluZyhvYmpba2V5XSxmbik7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYXZlcnNlUmVwbGFjaW5nVHlwZShvYmopIHtcclxuICAgIHJldHVybiB0cmF2ZXJzZUV4ZWN1dGluZyhvYmoscmVwbGFjZUlmVHlwZURlbGV0ZU0pO1xyXG4gICAgLypcclxuICAgIF8uZm9ySW4ob2JqLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcclxuICAgIC8vICAgIGNvbnNvbGUubG9nKHZhbCArIFwiIC0+IFwiICsga2V5ICsgXCIgXCIpO1xyXG4gICAgICAgIHJlcGxhY2VJZlR5cGVEZWxldGVNKG9iaix2YWwsa2V5KTtcclxuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbCkpIHtcclxuICAgICAgICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24oZWwpIHtcclxuICAgICAgICAgICAgICAgIGlmIChfLmlzT2JqZWN0KGVsKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYXZlcnNlUmVwbGFjaW5nVHlwZShlbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoXy5pc09iamVjdCh2YWwpKSB7XHJcbiAgICAgICAgICAgIHRyYXZlcnNlUmVwbGFjaW5nVHlwZShvYmpba2V5XSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICAqL1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdHlwZVByb3BzKGEgOiBhbnkpIDogYW55IHtcclxuICAgdmFyIGFDbG9uZWQgPSBfLmNsb25lRGVlcChhKTtcclxuICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhQ2xvbmVkLCB1bmRlZmluZWQsIDIpKTtcclxuICAgdHJhdmVyc2VSZXBsYWNpbmdUeXBlKGFDbG9uZWQpO1xyXG4gICByZXR1cm4gYUNsb25lZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VNb25nb29zZVNjaGVtYSggZXh0U2NoZW1hIDogSUV4dGVuZGVkU2NoZW1hICwgbW9uZ28/IDogYW55KSA6IG1vbmdvb3NlLlNjaGVtYSB7XHJcbiAgICB2YXIgdHlwZWRQcm9wcyA9IHR5cGVQcm9wcyhleHRTY2hlbWEucHJvcHMpO1xyXG4gICAgdmFyIG1vbmdvID0gbW9uZ28gfHwgbW9uZ29vc2U7XHJcbiAgICAgdmFyIHNjaGVtYSA9IG1vbmdvLlNjaGVtYShleHRTY2hlbWEucHJvcHMpOyAvL3sgcHJvcHMgOiBleHRTY2hlbWEucHJvcHMsIGluZGV4IDogZXh0U2NoZW1hLmluZGV4ICB9KTtcclxuICAgICBzY2hlbWEuaW5kZXgoZXh0U2NoZW1hLmluZGV4KTtcclxuICAgICByZXR1cm4gc2NoZW1hO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9hZEV4dGVuZGVkTW9uZ29vc2VTY2hlbWEobW9kZWxQYXRoOiBzdHJpbmcsIG1vZGVsTmFtZSA6IHN0cmluZyk6IElFeHRlbmRlZFNjaGVtYSB7XHJcbiAgdmFyIGZpbGVuYW1lID0gIG1vZGVsUGF0aCArICcvJyArIG1vZGVsTmFtZSArICcubW9kZWwubW9uZ29vc2VzY2hlbWEuanNvbic7XHJcbiAgZGVidWdsb2coKCk9PiBgYXR0ZW1wdGluZyB0byByZWFkICR7ZmlsZW5hbWV9YClcclxuICB2YXIgc2NoZW1hU2VyID0gRlV0aWxzLnJlYWRGaWxlQXNKU09OKGZpbGVuYW1lKTtcclxuICBzY2hlbWFTZXIubW9kZWxOYW1lID0gbW9kZWxOYW1lO1xyXG4gIHJldHVybiBzY2hlbWFTZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkTW9kZWxEb2MobW9kZWxQYXRoOiBzdHJpbmcsIG1vZGVsTmFtZSA6IHN0cmluZyk6IElNb2RlbERvYyB7XHJcbiAgdmFyIGRvY1NlciA9IEZVdGlscy5yZWFkRmlsZUFzSlNPTiggbW9kZWxQYXRoICsgJy8nICsgbW9kZWxOYW1lICsgJy5tb2RlbC5kb2MuanNvbicpO1xyXG4gIGRvY1Nlci5tb2RlbG5hbWUgPSBtb2RlbE5hbWU7XHJcbiAgcmV0dXJuIGRvY1NlcjtcclxufVxyXG5cclxudmFyIGFQcm9taXNlID0gZ2xvYmFsLlByb21pc2U7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElNb2RlbFJlYyAge1xyXG4gICAgY29sbGVjdGlvbk5hbWUgOiBzdHJpbmcsXHJcbiAgICBtb2RlbCA6IG1vbmdvb3NlLk1vZGVsPGFueT4sXHJcbiAgICBzY2hlbWEgOiBtb25nb29zZS5TY2hlbWFcclxufTtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudE1vbmdvb3NlU2NoZW1hKCBtb2RlbERvYyA6IElNb2RlbERvYywgc2NoZW1hUmF3IDogSVJhd1NjaGVtYSkgOiBJRXh0ZW5kZWRTY2hlbWEge1xyXG4gICAgZGVidWdsb2coICgpPT4nYXVnbWVudGluZyBmb3IgJyArIG1vZGVsRG9jLm1vZGVsbmFtZSk7XHJcbiAgICB2YXIgcmVzID0geyBkb21haW4gOiBtb2RlbERvYy5kb21haW4sXHJcbiAgICAgICAgbW9kZWxuYW1lIDogbW9kZWxEb2MubW9kZWxuYW1lLFxyXG4gICAgICAgIG1vbmdvb3NlbW9kZWxuYW1lIDogbWFrZU1vbmdvb3NlTW9kZWxOYW1lKG1vZGVsRG9jLm1vZGVsbmFtZSksXHJcbiAgICAgICAgY29sbGVjdGlvbm5hbWUgOiBtYWtlTW9uZ29Db2xsZWN0aW9uTmFtZShtb2RlbERvYy5tb2RlbG5hbWUpXHJcbiAgICAgfSBhcyBJRXh0ZW5kZWRTY2hlbWE7XHJcbiAgICByZXR1cm4gKE9iamVjdCBhcyBhbnkpLmFzc2lnbihyZXMsIHNjaGVtYVJhdyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm4gYSBtb2RlbG5hbWVcclxuICogQHBhcmFtIGNvbGxlY3Rpb25OYW1lXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFrZU1vbmdvb3NlTW9kZWxOYW1lKGNvbGxlY3Rpb25OYW1lIDogc3RyaW5nKSA6IHN0cmluZyB7XHJcbiAgICBpZihjb2xsZWN0aW9uTmFtZSAhPT0gY29sbGVjdGlvbk5hbWUudG9Mb3dlckNhc2UoKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZXhwZWN0IGxvd2VyY2FzZSwgd2FzICcgKyBjb2xsZWN0aW9uTmFtZSk7XHJcbiAgICB9XHJcbiAgICBpZiAoY29sbGVjdGlvbk5hbWUuY2hhckF0KGNvbGxlY3Rpb25OYW1lLmxlbmd0aC0xKSA9PT0gJ3MnKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lOyAvLyBiZXdhcmUsIEFMVEVSRUQgUkVDRU5UTFkgMjguMDguMjAxOVxyXG4gICAgICAgIC8vIHJldHVybiBjb2xsZWN0aW9uTmFtZS5zdWJzdHJpbmcoMCxjb2xsZWN0aW9uTmFtZS5sZW5ndGgtMSk7XHJcbiAgICB9XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdGVkIG5hbWUgd2l0aCB0cmFpbGluZyBzJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXR1cm5zIGEgbW9uZ29vc2UgY29sbGVjdGlvbiBuYW1lXHJcbiAqIEBwYXJhbSBtb2RlbE5hbWVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWtlTW9uZ29Db2xsZWN0aW9uTmFtZShtb2RlbE5hbWUgOiBzdHJpbmcpIDogc3RyaW5nIHtcclxuICAgIGlmKG1vZGVsTmFtZSAhPT0gbW9kZWxOYW1lLnRvTG93ZXJDYXNlKCkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdCBsb3dlcmNhc2UsIHdhcyAnICsgbW9kZWxOYW1lKTtcclxuICAgIH1cclxuICAgIGlmIChtb2RlbE5hbWUuY2hhckF0KG1vZGVsTmFtZS5sZW5ndGgtMSkgIT09ICdzJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignIGV4cGVjdCB0cmFpbGluZyBzOicgKyBtb2RlbE5hbWUgKTtcclxuICAgIH1cclxuICAgIGlmIChtb2RlbE5hbWUuY2hhckF0KG1vZGVsTmFtZS5sZW5ndGgtMSkgIT09ICdzJykge1xyXG4gICAgICAgIHJldHVybiBtb2RlbE5hbWUgKyAncyc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbW9kZWxOYW1lO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZW5kZWRTY2hlbWEobW9uZ29vc2UgOiBhbnkpIDogbW9uZ29vc2UuU2NoZW1hIHtcclxuICB2YXIgZXh0ZW5kU2NoZW1hID0gbW9uZ29vc2UuU2NoZW1hKEV4dGVuZGVkU2NoZW1hX3Byb3BzKTtcclxuICAgIC8vY29uc29sZS5sb2coXCJub3cgZXh0ZW5kZWQgc2NoZW1hXCIpO1xyXG4gICAgZXh0ZW5kU2NoZW1hLmluZGV4KEV4dGVuZGVkU2NoZW1hX2luZGV4KTtcclxuICAgIHJldHVybiBleHRlbmRTY2hlbWE7XHJcbiAgICAvL2NvbnNvbGUubG9nKCdjcmVhdGluZyBtb2RlbCAyJyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlbmRlZFNjaGVtYU1vZGVsKG1vbmdvb3NlIDogbW9uZ29vc2UuTW9uZ29vc2UpIDogbW9uZ29vc2UuTW9kZWw8YW55PiB7XHJcbiAgICB2YXIgbWdNb2RlbE5hbWUgPSBtYWtlTW9uZ29vc2VNb2RlbE5hbWUoTW9uZ29OTFEuQ09MTF9FWFRFTkRFRFNDSEVNQVMpXHJcbiAgICBpZihtb25nb29zZS5tb2RlbE5hbWVzKCkuaW5kZXhPZihtZ01vZGVsTmFtZSkgPj0gMCkge1xyXG4gICAgICAgIHJldHVybiBtb25nb29zZS5tb2RlbChtZ01vZGVsTmFtZSk7XHJcbiAgICB9XHJcbiAgICB2YXIgZXh0ZW5kU2NoZW1hID0gZ2V0RXh0ZW5kZWRTY2hlbWEobW9uZ29vc2UpO1xyXG4gICAgdmFyIG1vZGVsRVMgPSBtb25nb29zZS5tb2RlbChtYWtlTW9uZ29vc2VNb2RlbE5hbWUoTW9uZ29OTFEuQ09MTF9FWFRFTkRFRFNDSEVNQVMpLCBleHRlbmRTY2hlbWEpO1xyXG4gICAgcmV0dXJuIG1vZGVsRVM7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxEb2NNb2RlbChtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlKSA6IG1vbmdvb3NlLk1vZGVsPGFueT4ge1xyXG4gICAgdmFyIG1ldGFEb2MgPSBGVXRpbHMucmVhZEZpbGVBc0pTT04oIF9fZGlybmFtZSArICcvLi4vLi4vcmVzb3VyY2VzL21ldGEvbWV0YW1vZGVscy5tb2RlbC5kb2MuanNvbicpO1xyXG4gICAgbWV0YURvYy5tb2RlbG5hbWUgPSBNb25nb05MUS5NT0RFTE5BTUVfTUVUQU1PREVMUztcclxuICAgIHZhciBzY2hlbWFTZXIyID0gbG9hZEV4dGVuZGVkTW9uZ29vc2VTY2hlbWEoX19kaXJuYW1lICsgJy8uLi8uLi9yZXNvdXJjZXMvbWV0YScsTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFMpO1xyXG4gICAgdmFyIHNjaGVtYVNlciA9IGF1Z21lbnRNb25nb29zZVNjaGVtYShtZXRhRG9jLCBzY2hlbWFTZXIyKTtcclxuICAgIHZhciBzY2hlbWEgPSBtYWtlTW9uZ29vc2VTY2hlbWEoc2NoZW1hU2VyLCBtb25nb29zZSk7XHJcbiAgICB2YXIgbW9uZ29vc2VNb2RlbE5hbWUgPSBtYWtlTW9uZ29vc2VNb2RlbE5hbWUoTW9uZ29OTFEuQ09MTF9NRVRBTU9ERUxTKTtcclxuICAgIGlmIChtb25nb29zZS5tb2RlbE5hbWVzKCkuaW5kZXhPZihtb25nb29zZU1vZGVsTmFtZSkgPj0gMCkge1xyXG4gICAgICAgIHJldHVybiBtb25nb29zZS5tb2RlbChtb25nb29zZU1vZGVsTmFtZSk7XHJcbiAgICB9XHJcbiAgICB2YXIgbW9kZWxEb2MgPSBtb25nb29zZS5tb2RlbChtYWtlTW9uZ29vc2VNb2RlbE5hbWUoTW9uZ29OTFEuQ09MTF9NRVRBTU9ERUxTKSwgc2NoZW1hICk7XHJcbiAgICB2YXIgb0ZpbmQgPSBtb2RlbERvYy5maW5kO1xyXG4gICAgIHJldHVybiBtb2RlbERvYztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVwc2VydE1ldGFNb2RlbChtb25nb29zZSA6IGFueSkge1xyXG4gICAgZGVidWdsb2coKCk9PidoZXJlIGRpcm5hbWUgKyAnICsgX19kaXJuYW1lKTtcclxuICAgIHZhciBtZXRhRG9jID0gRlV0aWxzLnJlYWRGaWxlQXNKU09OKF9fZGlybmFtZSArICcvLi4vLi4vcmVzb3VyY2VzL21ldGEvbWV0YW1vZGVscy5tb2RlbC5kb2MuanNvbicpO1xyXG4gICAgZGVidWdsb2coICgpPT4gXCJoZXJlIG1ldGFEb2MgdG8gaW5zZXJ0IGFzIGxvYWRlZFwiICsgSlNPTi5zdHJpbmdpZnkobWV0YURvYykpO1xyXG4gICAgbWV0YURvYy5tb2RlbG5hbWUgPSBNb25nb05MUS5NT0RFTE5BTUVfTUVUQU1PREVMUztcclxuICAgIHZhciBzY2hlbWFTZXIyID0gbG9hZEV4dGVuZGVkTW9uZ29vc2VTY2hlbWEoX19kaXJuYW1lICsgJy8uLi8uLi9yZXNvdXJjZXMvbWV0YScsTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFMpO1xyXG4gICAgdmFyIHNjaGVtYVNlciA9IGF1Z21lbnRNb25nb29zZVNjaGVtYShtZXRhRG9jLCBzY2hlbWFTZXIyKTtcclxuXHJcbiAgICBkZWJ1Z2xvZyggKCk9PidoZXJlIHNjaGVtYXNlcicgKyBKU09OLnN0cmluZ2lmeShzY2hlbWFTZXIsdW5kZWZpbmVkLDIpKTtcclxuICAgIChtb25nb29zZSBhcyBhbnkpLlByb21pc2UgPSBnbG9iYWwuUHJvbWlzZTtcclxuICAgIHZhciBzY2hlbWEgPSBtYWtlTW9uZ29vc2VTY2hlbWEoc2NoZW1hU2VyLCBtb25nb29zZSk7XHJcbiAgICAvL2NvbnNvbGUubG9nKFwibWFrZSBzY2hlbWEgMVwiKTtcclxuICAgIC8vdmFyIGV4dGVuZFNjaGVtYSA9IG1vbmdvb3NlLlNjaGVtYShFeHRlbmRlZFNjaGVtYV9wcm9wcyk7XHJcbiAgICAvLy9jb25zb2xlLmxvZyhcIm5vdyBleHRlbmRlZCBzY2hlbWFcIik7XHJcbiAgICAvL2V4dGVuZFNjaGVtYS5pbmRleChFeHRlbmRlZFNjaGVtYV9pbmRleCk7XHJcbiAgICAvL2NvbnNvbGUubG9nKFwibm93IGRvY3VtZW50IC4uLlwiICsgSlNPTi5zdHJpbmdpZnkoZXh0ZW5kU2NoZW1hLHVuZGVmaW5lZCwyKSk7XHJcbiAgICB2YXIgbW9kZWxEb2MgPSBtb25nb29zZS5tb2RlbChtYWtlTW9uZ29vc2VNb2RlbE5hbWUoTW9uZ29OTFEuQ09MTF9NRVRBTU9ERUxTKSwgc2NoZW1hICk7XHJcbiAgICAvL2NvbnNvbGUubG9nKCdjcmVhdGluZyBtb2RlbCAyJyk7XHJcbiAgICB2YXIgbW9kZWxFUyA9IGdldEV4dGVuZGVkU2NoZW1hTW9kZWwobW9uZ29vc2UpOyAvL21vbmdvb3NlLm1vZGVsKG1ha2VNb25nb29zZU1vZGVsTmFtZShNb25nb05MUS5DT0xMX0VYVEVOREVEU0NIRU1BUyksIGV4dGVuZFNjaGVtYSk7XHJcblxyXG4gICAgZGVidWdsb2coICgpPT4gXCJoZXJlIG1ldGFEb2MgdG8gaW5zZXJ0XCIgKyBKU09OLnN0cmluZ2lmeShtZXRhRG9jKSk7XHJcbiAgICBkZWJ1Z2xvZyggKCk9PlwiaGVyZSBzY2hlbWFzZXIgdG8gaW5zZXJ0XCIgKyBKU09OLnN0cmluZ2lmeShzY2hlbWFTZXIpKTtcclxuICAgIHJldHVybiBQcm9taXNlLmFsbChbXHJcbiAgICAgICAgdmFsaWRhdGVEb2NWc01vbmdvb3NlTW9kZWwobW9kZWxEb2MsIG1ldGFEb2MpLnRoZW4oICgpPT5cclxuICAgICAgICAgICAgbW9kZWxEb2MuZmluZE9uZUFuZFVwZGF0ZSggeyBtb2RlbG5hbWUgOiAgTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFN9LCBtZXRhRG9jLCB7XHJcbiAgICAgICAgICAgICAgICB1cHNlcnQgOiB0cnVlXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKSxcclxuICAgICAgICB2YWxpZGF0ZURvY1ZzTW9uZ29vc2VNb2RlbChtb2RlbEVTLHNjaGVtYVNlcikudGhlbiggKCk9PlxyXG4gICAgICAgICAgICBtb2RlbEVTLmZpbmRPbmVBbmRVcGRhdGUoIHsgbW9kZWxuYW1lIDogIE1vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTfSwgc2NoZW1hU2VyLCB7XHJcbiAgICAgICAgICAgICAgICB1cHNlcnQgOiB0cnVlXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKV0pOyAvLy50aGVuKCAoKSA9PiBwcm9jZXNzLmV4aXQoLTEpKTtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEQldpdGhNb2RlbHMobW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSAsIG1vZGVsUGF0aCA6IHN0cmluZykgOiBQcm9taXNlPGFueT4ge1xyXG4gICAgcmV0dXJuIHVwc2VydE1ldGFNb2RlbChtb25nb29zZSkudGhlbihcclxuICAgICAgICB1cHNlcnRNb2RlbHMuYmluZCh1bmRlZmluZWQsIG1vbmdvb3NlLCBtb2RlbFBhdGgpXHJcbiAgICApO1xyXG59XHJcblxyXG5cclxuLy9leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxOYW1lcyhtb2RlbCA6IG1vbmdvb3NlLm1vZGVsLCApXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlT3RoZXJzKG1vbmdvb3NlIDogYW55LCBtb2RlbDogbW9uZ29vc2UuTW9kZWw8YW55PiwgcmV0YWluZWROYW1lcyA6IHN0cmluZ1tdICkgOiBQcm9taXNlPGFueT4ge1xyXG4gICAgLy9jb25zb2xlLmxvZygnaGVyZSBjb2xsZWN0aW9ubmFtZScgKyBPYmplY3Qua2V5cyhtb2RlbCkpO1xyXG4gICAgLy9jb25zb2xlLmxvZygnaGVyZSBjb2xsZWN0aW9ubmFtZScgKyBtb2RlbC5jb2xsZWN0aW9ubmFtZSk7XHJcbiAgICByZXR1cm4gKG1vZGVsLmFnZ3JlZ2F0ZShbeyRwcm9qZWN0IDogeyBtb2RlbG5hbWUgOiAxIH19XSkgYXMgYW55KS50aGVuKCAocikgPT5cclxuICAgICAgICByLm1hcChvID0+IChvIGFzIGFueSkubW9kZWxuYW1lIGFzIHN0cmluZylcclxuICAgICkudGhlbiggKG1vZGVsbmFtZXMgOiBhbnkpID0+IHtcclxuICAgICAgICBkZWJ1Z2xvZyhcIiBwcmVzZW50IG1vZGVscyBcIiArIG1vZGVsbmFtZXMubGVuZ3RoICsgJyAnICsgbW9kZWxuYW1lcyk7XHJcbiAgICAgICAgdmFyIGRlbHRhID0gXy5kaWZmZXJlbmNlKG1vZGVsbmFtZXMsIHJldGFpbmVkTmFtZXMpO1xyXG4gICAgICAgIGRlYnVnbG9nKCcgc3B1cmlvdXMgbW9kZWxzOiAnICsgZGVsdGEubGVuZ3RoICsgJyAnICsgZGVsdGEpO1xyXG4gICAgICAgIGlmKGRlbHRhLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoZGVsdGEubWFwKCBtb2RlbG5hbWUgPT4gKG1vZGVsLnJlbW92ZSBhcyBhbnkpKHsgbW9kZWxuYW1lIDogbW9kZWxuYW1lfSkpKTtcclxuICAgIH0pO1xyXG59XHJcbnZhciBTY2hlbWFPcGVyYXRvcnMgPSB7IG9wZXJhdG9ycyA6IHt9LCBzeW5vbnltcyA6IHt9fTtcclxuXHJcbnZhciBTY2hlbWFGaWxsZXJzID0geyBmaWxsZXJzIDogW3tcclxuICAgIHR5cGUgOiBTdHJpbmdcclxufV1cclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRPckNyZWF0ZU1vZGVsRmlsbGVycyhtb25nb29zZTogbW9uZ29vc2UuTW9uZ29vc2UpIDogbW9uZ29vc2UuTW9kZWw8YW55PiB7XHJcbiAgICBpZihtb25nb29zZS5tb2RlbE5hbWVzKCkuaW5kZXhPZignZmlsbGVycycpID49IDApIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwoJ2ZpbGxlcnMnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIG1vbmdvb3NlLm1vZGVsKCdmaWxsZXJzJywgbmV3IG1vbmdvb3NlLlNjaGVtYShTY2hlbWFGaWxsZXJzKSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRPckNyZWF0ZU1vZGVsT3BlcmF0b3JzKG1vbmdvb3NlOiBtb25nb29zZS5Nb25nb29zZSkgOiBtb25nb29zZS5Nb2RlbDxhbnk+IHtcclxuICAgIGlmKG1vbmdvb3NlLm1vZGVsTmFtZXMoKS5pbmRleE9mKCdvcGVyYXRvcnMnKSA+PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIG1vbmdvb3NlLm1vZGVsKCdvcGVyYXRvcnMnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIG1vbmdvb3NlLm1vZGVsKCdvcGVyYXRvcnMnLCBuZXcgbW9uZ29vc2UuU2NoZW1hKFNjaGVtYU9wZXJhdG9ycykpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsbGVyc0Zyb21EQiggbW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSkgOiBQcm9taXNlPGFueT4ge1xyXG4gICAgdmFyIGZpbGxlck1vZGVsID0gZ2V0T3JDcmVhdGVNb2RlbEZpbGxlcnMobW9uZ29vc2UpO1xyXG4gICAgcmV0dXJuIGZpbGxlck1vZGVsLmZpbmQoe30pLmxlYW4oKS5leGVjKCkudGhlbiggKHZhbHMgOiBhbnlbXSkgPT4ge1xyXG4gICAgICAgIGlmKHZhbHMubGVuZ3RoICE9PSAxKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignZXhwZWN0ZWQgZXhhY3RseSBvbmUgb3BlcmF0b3JzIGVudHJ5ICcpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHZhbHNbMF07XHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRPcGVyYXRvcnNGcm9tREIoIG1vbmdvb3NlIDogbW9uZ29vc2UuTW9uZ29vc2UpIDogUHJvbWlzZTxhbnk+IHtcclxuICAgIHZhciBvcGVyYXRvck1vZGVsID0gZ2V0T3JDcmVhdGVNb2RlbE9wZXJhdG9ycyhtb25nb29zZSk7XHJcbiAgICByZXR1cm4gb3BlcmF0b3JNb2RlbC5maW5kKHt9KS5sZWFuKCkuZXhlYygpLnRoZW4oICh2YWxzIDogYW55W10pID0+IHtcclxuICAgICAgICBpZih2YWxzLmxlbmd0aCAhPT0gMSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdGVkIGV4YWN0bHkgb25lIG9wZXJhdG9ycyBlbnRyeSAnKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiB2YWxzWzBdO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlbmRTY2hlbWFEb2NGcm9tREIobW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSwgbW9kZWxOYW1lIDogc3RyaW5nKSA6IFByb21pc2U8SUV4dGVuZGVkU2NoZW1hPiB7XHJcbiAgICB2YXIgbW9uZ29vc2VNb2RlbE5hbWUgPSBtYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxOYW1lKTtcclxuICAgIHZhciBtb2RlbF9FUyA9IG1vbmdvb3NlLm1vZGVsKE1vbmdvb3NlTkxRLk1PTkdPT1NFX01PREVMTkFNRV9FWFRFTkRFRFNDSEVNQVMpO1xyXG4gICAgdmFyIHJlcyA9IG1vZGVsX0VTLmZpbmQoeyBtb2RlbG5hbWUgOiBtb2RlbE5hbWV9KS5sZWFuKCkuZXhlYygpLnRoZW4oKGRvYykgPT5cclxuICAgIHsgICBkZWJ1Z2xvZyggKCk9PiBgIGxvYWRlZCBFcyBkb2MgJHttb2RlbE5hbWV9IHJldHVybmVkICR7KGRvYyBhcyBhbnkpLmxlbmd0aH0gZG9jdXMgZnJvbSBkYiA6IGBcclxuICAgICAgICArIChkb2MgYXMgYW55KVswXS5tb2RlbG5hbWUgKyBgYCArIChkb2MgYXMgYW55KVswXS5jb2xsZWN0aW9ubmFtZSApO1xyXG4gICAgICAgIGRlYnVnbG9nKCgpID0+ICdoZXJlIHRoZSByZXN1bHQnICsgSlNPTi5zdHJpbmdpZnkoZG9jKSk7XHJcbiAgICAgICAgaWYoKGRvYyBhcyBhbnkpLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcignTW9kZWwgJyArIG1vZGVsTmFtZSArICcgaXMgbm90IHByZXNlbnQgaW4gJyArIE1vbmdvb3NlTkxRLk1PTkdPT1NFX01PREVMTkFNRV9FWFRFTkRFRFNDSEVNQVMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZG9jWzBdO1xyXG4gICAgfSk7XHJcbiAgICAvL2NvbnNvbGUubG9nKCdyZXMnICsgdHlwZW9mIHJlcyk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gLy8gICByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ21vZGVsICcgKyBtb2RlbE5hbWUgKyAnIGNhbm5vdCBiZSBmb3VuZCBvbiBkYicpO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsRG9jRnJvbURCKG1vbmdvb3NlIDogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVsTmFtZSA6IHN0cmluZykgOiBQcm9taXNlPElNb2RlbERvYz4ge1xyXG4gICAgdmFyIG1vbmdvb3NlTW9kZWxOYW1lID0gbWFrZU1vbmdvb3NlTW9kZWxOYW1lKG1vZGVsTmFtZSk7XHJcbiAgICB2YXIgbW9kZWxfRVMgPSBtb25nb29zZS5tb2RlbChNb25nb29zZU5MUS5NT05HT09TRV9NT0RFTE5BTUVfRVhURU5ERURTQ0hFTUFTKTtcclxuICAgIHJldHVybiBtYWtlTW9kZWxGcm9tREIobW9uZ29vc2UsIE1vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTKS50aGVuKFxyXG4gICAgICAgIChtb2RlbCkgPT4gbW9kZWwuZmluZCh7IG1vZGVsbmFtZSA6IG1vZGVsTmFtZX0pLmxlYW4oKS5leGVjKClcclxuICAgICkudGhlbigoZG9jKSA9PlxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgZGVidWdsb2coICgpPT4gJyBsb2FkZWQgTW9kZWwgZG9jICR7bW9kZWxOYW1lfSByZXR1cm5lZCAkeyhkb2MgYXMgYW55KS5sZW5ndGh9IGRvY3VzIGZyb20gZGIgOiAnXHJcbiAgICAgICAgICAgICsgKGRvYyBhcyBhbnkpWzBdLm1vZGVsbmFtZSArIGAgYCArIChkb2MgYXMgYW55KVswXS5jb2xsZWN0aW9ubmFtZSApO1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygnaGVyZSB0aGUgcmVzdWx0JyArIEpTT04uc3RyaW5naWZ5KGRvYykpO1xyXG4gICAgICAgICAgICBpZigoZG9jIGFzIGFueSkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcignTW9kZWwgJyArIG1vZGVsTmFtZSArICcgaXMgbm90IHByZXNlbnQgaW4gJyArIE1vbmdvb3NlTkxRLk1PTkdPT1NFX01PREVMTkFNRV9FWFRFTkRFRFNDSEVNQVMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBkb2NbMF07XHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxuIC8vICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdtb2RlbCAnICsgbW9kZWxOYW1lICsgJyBjYW5ub3QgYmUgZm91bmQgb24gZGInKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VNb2RlbEZyb21EQihtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlLCBtb2RlbE5hbWUgOiBzdHJpbmcpIDogUHJvbWlzZTxtb25nb29zZS5Nb2RlbDxhbnk+PiB7XHJcbiAgICB2YXIgbW9uZ29vc2VNb2RlbE5hbWUgPSBtYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxOYW1lKTtcclxuICAgIGlmKG1vbmdvb3NlLm1vZGVsTmFtZXMoKS5pbmRleE9mKG1vbmdvb3NlTW9kZWxOYW1lKSA+PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShtb25nb29zZS5tb2RlbChtb25nb29zZU1vZGVsTmFtZSkpO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2coICgpPT4naGVyZSBwcmVzZW50IG1vZGVsbmFtZXM6ICcgKyBtb25nb29zZS5tb2RlbE5hbWVzKCkuam9pbignXFxuJykpO1xyXG4gICAgdmFyIG1vZGVsX0VTID0gbW9uZ29vc2UubW9kZWwoTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICBkZWJ1Z2xvZyggKCk9PidoZXJlIG1vZGVsbmFtZTonICsgbW9kZWxOYW1lKTtcclxuICAgIHZhciByZXMgPSBtb2RlbF9FUy5maW5kKHsgbW9kZWxuYW1lIDogbW9kZWxOYW1lfSkubGVhbigpLmV4ZWMoKS50aGVuKChkb2MpID0+XHJcbiAgICB7ICBkZWJ1Z2xvZyggKCk9PmAgbG9hZGVkIE1vZGVsIGRvYyAke21vZGVsTmFtZX0gcmV0dXJuZWQgJHsoZG9jIGFzIGFueSkubGVuZ3RofSBkb2N1cyBmcm9tIGRiIDogYFxyXG4gICAgICAgICAgICArIChkb2MgYXMgYW55KVswXS5tb2RlbG5hbWUgKyBgIGAgKyAoZG9jIGFzIGFueSlbMF0uY29sbGVjdGlvbm5hbWUgKTtcclxuICAgICAgICBkZWJ1Z2xvZyggKCk9PidoZXJlIHRoZSByZXN1bHQnICsgSlNPTi5zdHJpbmdpZnkoZG9jKSk7XHJcbiAgICAgICAgaWYoKGRvYyBhcyBhbnkpLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcignTW9kZWwgJyArIG1vZGVsTmFtZSArICcgaXMgbm90IHByZXNlbnQgaW4gJyArIE1vbmdvb3NlTkxRLk1PTkdPT1NFX01PREVMTkFNRV9FWFRFTkRFRFNDSEVNQVMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWJ1Z2xvZygoKT0+ICdjcmVhdGluZyBzY2hlbWEgZm9yICcgKyBtb2RlbE5hbWUgKyAnIGZyb20gJyk7XHJcbiAgICAgICAgLy8gICsgSlNPTi5zdHJpbmdpZnkoZG9jWzBdKSk7XHJcblxyXG4gICAgICAgIHZhciBzY2hlbWEgPSBtYWtlTW9uZ29vc2VTY2hlbWEoZG9jWzBdIGFzIElFeHRlbmRlZFNjaGVtYSxtb25nb29zZSk7XHJcbiAgICAgICAgaWYobW9uZ29vc2UubW9kZWxOYW1lcygpLmluZGV4T2YobW9uZ29vc2VNb2RlbE5hbWUpID49IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShtb25nb29zZS5tb2RlbChtb25nb29zZU1vZGVsTmFtZSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zb2xlLmxvZygnIG1vb25nb29zZU1vZGVsTmFtZSA6ICcgKyBtb25nb29zZU1vZGVsTmFtZSArICcgJyArIG1vZGVsTmFtZSApO1xyXG4gICAgICAgIHZhciBtb2RlbCA9IG1vbmdvb3NlLm1vZGVsKG1vbmdvb3NlTW9kZWxOYW1lLCBzY2hlbWEpO1xyXG4gICAgICAgIGRlYnVnbG9nKCAoKT0+ICdyZXR1cm5pbmcgbW9kZWw6ICcgKyBtb2RlbE5hbWUgKyBgIGArIHR5cGVvZiBtb2RlbCk7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShtb2RlbCk7XHJcbiAgICB9KTtcclxuICAgIC8vY29uc29sZS5sb2coJ3JlcycgKyB0eXBlb2YgcmVzKTtcclxuICAgIHJldHVybiByZXM7XHJcbiAvLyAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnbW9kZWwgJyArIG1vZGVsTmFtZSArICcgY2Fubm90IGJlIGZvdW5kIG9uIGRiJyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1cGxvYWRGaWxsZXJzKG1vbmdvb3NlOiBtb25nb29zZS5Nb25nb29zZSwgbW9kZWxQYXRoOiBzdHJpbmcpIDogUHJvbWlzZTxhbnk+IHtcclxuICAgIHZhciBtb2RlbEZpbGxlciA9IGdldE9yQ3JlYXRlTW9kZWxGaWxsZXJzKG1vbmdvb3NlKTtcclxuICAgIHJldHVybiBtb2RlbEZpbGxlci5yZW1vdmUoe30pLnRoZW4oKCkgPT4ge1xyXG4gICAgdmFyIGZpbGxlcnMgPSBGVXRpbHMucmVhZEZpbGVBc0pTT04obW9kZWxQYXRoICsgJy9maWxsZXIuanNvbicpO1xyXG4gICAgICAgIHJldHVybiBuZXcgbW9kZWxGaWxsZXIoeyBmaWxsZXJzOiBmaWxsZXJzfSkuc2F2ZSgpO1xyXG4gICAgfSk7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHVwbG9hZE9wZXJhdG9ycyhtb25nb29zZTogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVsUGF0aDogc3RyaW5nKSA6IFByb21pc2U8YW55PiB7XHJcbiAgICB2YXIgbW9kZWxGaWxsZXIgPSBnZXRPckNyZWF0ZU1vZGVsT3BlcmF0b3JzKG1vbmdvb3NlKTtcclxuICAgIHJldHVybiBtb2RlbEZpbGxlci5yZW1vdmUoe30pLnRoZW4oKCkgPT4ge1xyXG4gICAgdmFyIG9wZXJhdG9ycyA9IEZVdGlscy5yZWFkRmlsZUFzSlNPTihtb2RlbFBhdGggKyAnL29wZXJhdG9ycy5qc29uJyk7XHJcbiAgICByZXR1cm4gbmV3IG1vZGVsRmlsbGVyKG9wZXJhdG9ycykuc2F2ZSgpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGxvYWRzIHRoZSBjb21wbGV0ZSBtb2RlbCAobWV0YWRhdGEhKSBpbmZvcm1hdGlvblxyXG4gKiBBc3N1bWVzIG1ldGFtb2RlbCBoYXMgYmVlbiBsb2FkZWQgKHNlZSAjdXBzZXJ0TWV0YU1vZGVscylcclxuICogQHBhcmFtIG1vbmdvb3NlIHttb25nb29zZS5Nb25nb29zZX0gdGhlIG1vbmdvb3NlIGhhbmRsZVxyXG4gKiBAcGFyYW0gbW9kZWxwYXRoIHtzdHJpbmd9ICB0aGUgbW9kZWwgcGF0aFxyXG4gKiBAcmV0dXJuIFByb21pc2U8YW55PiB0aGUgIHByb21pc2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB1cHNlcnRNb2RlbHMobW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSwgbW9kZWxwYXRoOiBzdHJpbmcpICA6IFByb21pc2U8YW55PiB7XHJcbiAgICBkZWJ1Z2xvZygoKT0+IGBtb2RlbHBhdGggJHttb2RlbHBhdGh9IGApO1xyXG4gICAgdmFyIG1vZGVsTmFtZXMgPSBsb2FkTW9kZWxOYW1lcyhtb2RlbHBhdGgpO1xyXG4gICAgdmFyIG1vZGVsX0VTID0gbW9uZ29vc2UubW9kZWwoTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICB2YXIgbW9kZWxfRG9jID0gbW9uZ29vc2UubW9kZWwoTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX01FVEFNT0RFTFMpO1xyXG4gICAgZGVidWdsb2coJ2hlcmUgbW9kZWxuYW1lcyAnICsgbW9kZWxOYW1lcyk7XHJcbiAgICByZXR1cm4gcmVtb3ZlT3RoZXJzKG1vbmdvb3NlLCBtb2RlbF9FUywgW01vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTXSApLnRoZW4oICgpPT5cclxuICAgICAgICBQcm9taXNlLmFsbChtb2RlbE5hbWVzLm1hcCggKG1vZGVsTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygndXBzZXJ0aW5nICAnICsgbW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgdmFyIG1vZGVsRG9jID0gbG9hZE1vZGVsRG9jKG1vZGVscGF0aCwgbW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgdmFyIHNjaGVtYVNlciA9IGxvYWRFeHRlbmRlZE1vbmdvb3NlU2NoZW1hKG1vZGVscGF0aCwgbW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgdmFyIHNjaGVtYUZ1bGwgPSBhdWdtZW50TW9uZ29vc2VTY2hlbWEobW9kZWxEb2MsIHNjaGVtYVNlcik7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKGB1cHNlcnRpbmcgZXNjaGVtYSAke21vZGVsTmFtZX0gIHdpdGggbW9kZWxEb2NgICsgSlNPTi5zdHJpbmdpZnkoc2NoZW1hRnVsbCkpO1xyXG4gICAgICAgICAgICB2YXIgcDEgPSBtb2RlbF9FUy5maW5kT25lQW5kVXBkYXRlKCB7IG1vZGVsbmFtZSA6IG1vZGVsTmFtZSB9LCBzY2hlbWFGdWxsLCB7XHJcbiAgICAgICAgICAgICAgICB1cHNlcnQgOiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZyhgdXBzZXJ0aW5nIG1vZGVsICR7bW9kZWxOYW1lfSAgd2l0aCBtb2RlbERvY2AgKyBKU09OLnN0cmluZ2lmeShtb2RlbERvYykpO1xyXG4gICAgICAgICAgICB2YXIgcDIgPSBtb2RlbF9Eb2MuZmluZE9uZUFuZFVwZGF0ZSggeyBtb2RlbG5hbWUgOiBtb2RlbE5hbWUgfSwgbW9kZWxEb2MsIHtcclxuICAgICAgICAgICAgICAgIHVwc2VydCA6IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChbcDEscDJdKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIClcclxuICAgICkudGhlbiggKCkgPT4ge1xyXG4gICAgICAgIHZhciBtb2RlbE5hbWVzRXh0ZW5kZWQgPSBtb2RlbE5hbWVzLnNsaWNlKCk7XHJcbiAgICAgICAgbW9kZWxOYW1lc0V4dGVuZGVkLnB1c2goTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFMpO1xyXG4gICAgICAgIGRlYnVnbG9nKCdyZW1vdmluZyBzcHVyaW91cyBtb2RlbHMnKTtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xyXG4gICAgICAgICAgICByZW1vdmVPdGhlcnMobW9uZ29vc2UsIG1vZGVsX0VTLCBtb2RlbE5hbWVzRXh0ZW5kZWQgKSxcclxuICAgICAgICAgICAgcmVtb3ZlT3RoZXJzKG1vbmdvb3NlLCBtb2RlbF9Eb2MsIG1vZGVsTmFtZXNFeHRlbmRlZCApXHJcbiAgICAgICAgXSk7XHJcbiAgICB9KS50aGVuKCAoKSA9PiB7XHJcbiAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChbXHJcbiAgICAgICAgICAgIHVwbG9hZEZpbGxlcnMobW9uZ29vc2UsbW9kZWxwYXRoKSxcclxuICAgICAgICAgICAgdXBsb2FkT3BlcmF0b3JzKG1vbmdvb3NlLCBtb2RlbHBhdGgpXHJcbiAgICAgICAgIF0pXHJcbiAgICB9KVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaGFzTWV0YUNvbGxlY3Rpb24obW9uZ29vc2UgOiBhbnkpIDogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgbW9uZ29vc2UuY29ubmVjdGlvbi5kYi5saXN0Q29sbGVjdGlvbnMoKS50b0FycmF5KChlcnIgLG5hbWVzICkgPT5cclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmKGVycikge1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYobmFtZXMuaW5kZXhPZihNb25nb05MUS5DT0xMX01FVEFNT0RFTFMpID49IDApIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVqZWN0KFwiZG9tYWluIG5vdCBsb2FkZWRcIik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IE1vbmdvTkxRID0ge1xyXG4gICAgTU9ERUxOQU1FX01FVEFNT0RFTFMgOiBcIm1ldGFtb2RlbHNcIixcclxuICAgIENPTExfTUVUQU1PREVMUyA6IFwibWV0YW1vZGVsc1wiLFxyXG4gICAgQ09MTF9FWFRFTkRFRFNDSEVNQVMgOiBcIm1vbmdvbmxxX2VzY2hlbWFzXCJcclxufTtcclxuXHJcblxyXG5leHBvcnQgY29uc3QgTW9uZ29vc2VOTFEgPSB7XHJcbiAgICBNT05HT09TRV9NT0RFTE5BTUVfRVhURU5ERURTQ0hFTUFTIDogbWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfRVhURU5ERURTQ0hFTUFTKSxcclxuICAgIE1PTkdPT1NFX01PREVMTkFNRV9NRVRBTU9ERUxTIDogbWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfTUVUQU1PREVMUylcclxufTtcclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsUmVjQnlNb2RlbE5hbWUobW9uZ29vc2UgOiBhbnksIG1vZGVsUGF0aDogc3RyaW5nLCBtb2RlbE5hbWUgOiBzdHJpbmcpIDogUHJvbWlzZTxJTW9kZWxSZWM+ICB7XHJcbiAgICAvLyBkbyB3ZSBoYXZlIHRoZSBtZXRhIGNvbGxlY3Rpb24gaW4gdGhlIGRiP1xyXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFtcclxuICAgICAgICBtb25nb29zZS5jb25uZWN0aW9uLmRiW01vbmdvTkxRLkNPTExfTUVUQU1PREVMU10uZmluZCh7IG1vZGVsTmFtZSA6IG1vZGVsTmFtZX0pLFxyXG4gICAgICAgIG1vbmdvb3NlLmNvbm5lY3Rpb24uZGJbTW9uZ29OTFEuQ09MTF9FWFRFTkRFRFNDSEVNQVNdLmZpbmQoeyBtb2RlbE5hbWUgOiBtb2RlbE5hbWV9KVxyXG4gICAgXSkudGhlbihyZXMgPT4ge1xyXG4gICAgICAgIHZhciBtb2RlbERvYyA9IHJlc1swXTtcclxuICAgICAgICB2YXIgZXh0ZW5kZWRTY2hlbWEgPSByZXNbMV07XHJcbiAgICAgICAgdmFyIHNjaGVtYSA9IG1ha2VNb25nb29zZVNjaGVtYShleHRlbmRlZFNjaGVtYSk7XHJcbiAgICAgICAgdmFyIG1vZGVsID0gbW9uZ29vc2UubW9kZWwobW9kZWxEb2MuY29sbGVjdGlvbk5hbWUsIHNjaGVtYSk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY29sbGVjdGlvbk5hbWUgOiBtb2RlbERvYy5jb2xsZWN0aW9uTmFtZSxcclxuICAgICAgICAgICAgbW9kZWxEb2MgOiBtb2RlbERvYyxcclxuICAgICAgICAgICAgc2NoZW1hIDogbWFrZU1vbmdvb3NlU2NoZW1hKGV4dGVuZGVkU2NoZW1hKSxcclxuICAgICAgICAgICAgbW9kZWwgOiBtb2RlbFxyXG4gICAgICAgIH0gYXMgSU1vZGVsUmVjO1xyXG4gICAgfSk7XHJcbn1cclxuKi9cclxuXHJcbi8qXHJcbiAgICBoYXNNZXRhQ29sbGVjdGlvbihtb25nb29zZSkudGhlbiggKCkgPT4ge1xyXG4gICAgICAgIG1vbmdvb3NlLmNvbm5lY3Rpb24uZGIubWdubHFfZG9tYWlucy5maW5kKCB7XHJcbiAgICAgICAgICAgIG1vZGVsTmFtZSA6IG1vZGVsTmFtZVxyXG4gICAgICAgIH0pLnRoZW4oIGRvYyA9PiB7XHJcbiAgICAgICAgICAgIGlmIChkb2Muc2NoZW1hKVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICBtb25nb29zZS5jb25uZWN0aW9uLmRiLmxpc3RDb2xsZWN0aW9ucygpLnRvQXJyYXkoKGVyciAsbmFtZXMgKSA9PlxyXG4gICAge1xyXG4gICAgICAgIGlmKG5hbWVzLmluZGV4T2YoXCJtZ25scV9kb21haW5zXCIpID49IDApIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuKi9cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVEb2NNb25nb29zZShtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlLCBjb2xsZWN0aW9ubmFtZSwgc2NoZW1hIDogbW9uZ29vc2UuU2NoZW1hLCBkb2MgOiBhbnkgKSB7XHJcbiAgICB2YXIgRG9jTW9kZWw7XHJcbiAgICAvL2NvbnNvbGUubG9nKCdzY2hlbWEgJyArIEpTT04uc3RyaW5naWZ5KHNjaGVtYSkpO1xyXG4gICAgaWYobW9uZ29vc2UubW9kZWxOYW1lcygpLmluZGV4T2YoY29sbGVjdGlvbm5hbWUpID49IDApIHtcclxuICAgICAgICBEb2NNb2RlbCA9IG1vbmdvb3NlLm1vZGVsKGNvbGxlY3Rpb25uYW1lKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgRG9jTW9kZWwgPSBtb25nb29zZS5tb2RlbChjb2xsZWN0aW9ubmFtZSwgc2NoZW1hKTtcclxuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsaWRhdGVEb2NWc01vbmdvb3NlTW9kZWwoRG9jTW9kZWwsIGRvYyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZURvY1ZzTW9uZ29vc2VNb2RlbChtb2RlbCwgZG9jIDogYW55KSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSxyZWplY3QpID0+IHtcclxuICAgICAgICB2YXIgdGhlRG9jID0gbmV3IG1vZGVsKGRvYyk7XHJcbiAgICAgICAgdGhlRG9jLnZhbGlkYXRlKChlcnIpID0+ICB7XHJcbiAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coZXJyKTtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJlc29sdmUodGhlRG9jKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlRG9jKGNvbGxlY3Rpb25uYW1lOiBzdHJpbmcsIHNjaGVtYSA6IG1vbmdvb3NlLlNjaGVtYSwgZG9jIDogYW55KSB7XHJcbiAgdmFyIGpzb25TY2hlbWFSID0gKHNjaGVtYSBhcyBhbnkpLmpzb25TY2hlbWEoKTtcclxuICB2YXIganNvblNjaGVtYSA9IF8uY2xvbmVEZWVwKGpzb25TY2hlbWFSKTtcclxuICB0cmF2ZXJzZUV4ZWN1dGluZyhqc29uU2NoZW1hLCBmdW5jdGlvbihvYmosdmFsLGtleSkge1xyXG4gICAgaWYoa2V5ID09PSAncHJvcGVydGllcycgJiYgb2JqLnR5cGUgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZygnYXVnbWVudGluZyBzY2hlbWEnKTtcclxuICAgICAgICBvYmouYWRkaXRpb25hbFByb3BlcnRpZXMgPSBmYWxzZTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgZGVidWdsb2coKCk9PiBgIGhlcmUganNvbiBzY2hlbWEgYCArIChKU09OLnN0cmluZ2lmeShqc29uU2NoZW1hLHVuZGVmaW5lZCwyKSkpO1xyXG4gIHZhciBWYWxpZGF0b3IgPSByZXF1aXJlKCdqc29uc2NoZW1hJykuVmFsaWRhdG9yO1xyXG4gIHZhciB2ID0gbmV3IFZhbGlkYXRvcigpO1xyXG4gIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoanNvblNjaGVtYSx1bmRlZmluZWQsMikpO1xyXG4gIHZhciB2YWxyZXN1bHQgPSB2LnZhbGlkYXRlKGRvYyxqc29uU2NoZW1hKTtcclxuICBpZih2YWxyZXN1bHQuZXJyb3JzLmxlbmd0aCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTY2hlbWEgdmFsaWRhdGluZyBhZ2FpbnN0IEpTT04gU2NoZW1hIGZhaWxlZCA6IFwiICsgSlNPTi5zdHJpbmdpZnkodmFscmVzdWx0LmVycm9ycyx1bmRlZmluZWQsMikpO1xyXG4gIH1cclxuICByZXR1cm4gdHJ1ZTtcclxufSJdfQ==

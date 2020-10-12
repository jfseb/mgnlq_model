"use strict";
/**
 * Functionality managing the match models
 *
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDoc = exports.validateDocVsMongooseModel = exports.validateDocMongoose = exports.MongooseNLQ = exports.MongoNLQ = exports.hasMetaCollection = exports.upsertModels = exports.validatePropertyNames = exports.uploadOperators = exports.uploadFillers = exports.makeModelFromDB = exports.getModelDocFromDB = exports.getExtendSchemaDocFromDB = exports.getOperatorsFromDB = exports.getFillersFromDB = exports.getOrCreateModelOperators = exports.getOrCreateModelFillers = exports.removeOthers = exports.createDBWithModels = exports.upsertMetaModel = exports.getModelDocModel = exports.getExtendedSchemaModel = exports.getExtendedSchema = exports.makeMongoCollectionName = exports.makeMongooseModelName = exports.augmentMongooseSchema = exports.loadModelDoc = exports.loadExtendedMongooseSchema = exports.makeMongooseSchema = exports.typeProps = exports.replaceIfTypeDeleteM = exports.mapType = exports.loadModelNames = exports.cmpTools = void 0;
//import * as intf from 'constants';
const debug = require("debugf");
var debuglog = debug('schemaload');
const FUtils = require("../model/model");
const MongoMap = require("../model/mongomap");
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
function validatePropertyNames(modelDoc, eschema) {
    modelDoc._categories.forEach(cat => {
        var propertyName = MongoMap.makeCanonicPropertyName(cat.category);
        var prop = MongoMap.findEschemaPropForCategory(eschema.props, cat.category);
        if (!prop) {
            throw new Error("Unable to find property " + propertyName + " for category " + cat.category + " in model  "
                + modelDoc.modelname
                + ">" + Object.getOwnPropertyNames(eschema.props).join(",\n") + " " + JSON.stringify(eschema.props));
        }
    });
}
exports.validatePropertyNames = validatePropertyNames;
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
        validatePropertyNames(modelDoc, schemaSer);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tb2RlbGxvYWQvc2NoZW1hbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBRUgsb0NBQW9DO0FBQ3BDLGdDQUFnQztBQUVoQyxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7QUFTbkMseUNBQXlDO0FBRXpDLDhDQUE4QztBQUU5Qyw0Q0FBNEM7QUFDNUMsOENBQThDO0FBQzlDLG1DQUFtQztBQUNuQyw0QkFBNEI7QUFDNUIscUNBQXFDO0FBRXBDLFFBQWdCLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFFM0M7O0dBRUc7QUFDSCxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoRDs7R0FFRztBQUNILElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSx1Q0FBdUMsQ0FBQztBQUU1RixTQUFnQixRQUFRLENBQUMsQ0FBZSxFQUFFLENBQWU7SUFDdkQsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEMsQ0FBQztBQUZELDRCQUVDO0FBS0QsTUFBTSxvQkFBb0IsR0FBRztJQUN6QixXQUFXLEVBQUU7UUFDWCxNQUFNLEVBQUUsTUFBTTtRQUNkLE1BQU0sRUFBRSxJQUFJO1FBQ1osVUFBVSxFQUFHLElBQUk7S0FDbEI7SUFDRCxRQUFRLEVBQUU7UUFDUixNQUFNLEVBQUUsTUFBTTtRQUNkLE1BQU0sRUFBRSxJQUFJO1FBQ1osVUFBVSxFQUFHLElBQUk7S0FDbEI7SUFDRCxtQkFBbUIsRUFBRTtRQUNuQixNQUFNLEVBQUUsTUFBTTtRQUNkLE1BQU0sRUFBRSxJQUFJO1FBQ1osVUFBVSxFQUFHLElBQUk7S0FDbEI7SUFDRCxnQkFBZ0IsRUFBRTtRQUNoQixNQUFNLEVBQUUsTUFBTTtRQUNkLE1BQU0sRUFBRSxJQUFJO1FB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LENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUUsRUFBRSxDQUFDLG9CQUFvQixHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRSxJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQ2hELElBQUksQ0FBQyxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7SUFDeEIsc0RBQXNEO0lBQ3RELElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzNDLElBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckg7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFuQkQsa0NBbUJDIiwiZmlsZSI6Im1vZGVsbG9hZC9zY2hlbWFsb2FkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEZ1bmN0aW9uYWxpdHkgbWFuYWdpbmcgdGhlIG1hdGNoIG1vZGVsc1xyXG4gKlxyXG4gKiBAZmlsZVxyXG4gKi9cclxuXHJcbi8vaW1wb3J0ICogYXMgaW50ZiBmcm9tICdjb25zdGFudHMnO1xyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Z2YnO1xyXG5cclxudmFyIGRlYnVnbG9nID0gZGVidWcoJ3NjaGVtYWxvYWQnKTtcclxuXHJcbi8vY29uc3QgbG9hZGxvZyA9IGxvZ2dlci5sb2dnZXIoJ21vZGVsbG9hZCcsICcnKTtcclxuXHJcbmltcG9ydCAqICBhcyBJTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XHJcbi8vaW1wb3J0ICogYXMgSW5wdXRGaWx0ZXJSdWxlcyBmcm9tICcuLi9tYXRjaC9ydWxlJztcclxuLy9pbXBvcnQgKiBhcyBUb29scyBmcm9tICcuLi9tYXRjaC90b29scyc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgTWV0YSBmcm9tICcuLi9tb2RlbC9tZXRhJztcclxuaW1wb3J0ICogYXMgRlV0aWxzIGZyb20gJy4uL21vZGVsL21vZGVsJztcclxuaW1wb3J0IHsgSUZNb2RlbCB9IGZyb20gJy4uJztcclxuaW1wb3J0ICogYXMgTW9uZ29NYXAgZnJvbSAnLi4vbW9kZWwvbW9uZ29tYXAnO1xyXG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICdhYm90X3V0aWxzJztcclxuLy9pbXBvcnQgKiBhcyBDaXJjdWxhclNlciBmcm9tICdhYm90X3V0aWxzJztcclxuLy9pbXBvcnQgKiBhcyBEaXN0YW5jZSBmcm9tICdhYm90X3N0cmluZ2Rpc3QnO1xyXG5pbXBvcnQgKiBhcyBwcm9jZXNzIGZyb20gJ3Byb2Nlc3MnO1xyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcbmltcG9ydCAqIGFzIG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcclxuXHJcbihtb25nb29zZSBhcyBhbnkpLlByb21pc2UgPSBnbG9iYWwuUHJvbWlzZTtcclxuXHJcbi8qKlxyXG4gKiBXQVRDSCBvdXQsIHRoaXMgaW5zdHJ1bWVudHMgbW9uZ29vc2UhXHJcbiAqL1xyXG5yZXF1aXJlKCdtb25nb29zZS1zY2hlbWEtanNvbnNjaGVtYScpKG1vbmdvb3NlKTtcclxuLyoqXHJcbiAqIHRoZSBtb2RlbCBwYXRoLCBtYXkgYmUgY29udHJvbGxlZCB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVcclxuICovXHJcbnZhciBlbnZNb2RlbFBhdGggPSBwcm9jZXNzLmVudltcIkFCT1RfTU9ERUxQQVRIXCJdIHx8IFwibm9kZV9tb2R1bGVzL2Fib3RfdGVzdG1vZGVsL3Rlc3Rtb2RlbFwiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNtcFRvb2xzKGE6IElNYXRjaC5JVG9vbCwgYjogSU1hdGNoLklUb29sKSB7XHJcbiAgcmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSk7XHJcbn1cclxuXHJcblxyXG50eXBlIElNb2RlbCA9IElNYXRjaC5JTW9kZWw7XHJcblxyXG5jb25zdCBFeHRlbmRlZFNjaGVtYV9wcm9wcyA9IHtcclxuICAgIFwibW9kZWxuYW1lXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFN0cmluZyxcclxuICAgICAgXCJ0cmltXCI6IHRydWUsXHJcbiAgICAgIFwicmVxdWlyZWRcIiA6IHRydWVcclxuICAgIH0sXHJcbiAgICBcImRvbWFpblwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBTdHJpbmcsXHJcbiAgICAgIFwidHJpbVwiOiB0cnVlLFxyXG4gICAgICBcInJlcXVpcmVkXCIgOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgXCJtb25nb29zZW1vZGVsbmFtZVwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBTdHJpbmcsXHJcbiAgICAgIFwidHJpbVwiOiB0cnVlLFxyXG4gICAgICBcInJlcXVpcmVkXCIgOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgXCJjb2xsZWN0aW9ubmFtZVwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBTdHJpbmcsXHJcbiAgICAgIFwidHJpbVwiOiB0cnVlLFxyXG4gICAgICBcInJlcXVpcmVkXCIgOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgXCJwcm9wc1wiIDoge30sXHJcbiAgICBcImluZGV4XCIgOiB7fVxyXG59O1xyXG5jb25zdCBFeHRlbmRlZFNjaGVtYV9pbmRleCA9IHtcclxuICAgIFwibW9kZWxuYW1lXCIgOiBcInRleHRcIlxyXG59O1xyXG5cclxuXHJcblxyXG4vLyBsb2FkIHRoZSBtb2RlbHNcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkTW9kZWxOYW1lcyhtb2RlbFBhdGggOiBzdHJpbmcpIDogc3RyaW5nW10ge1xyXG4gIG1vZGVsUGF0aCA9IG1vZGVsUGF0aCB8fCBlbnZNb2RlbFBhdGg7XHJcbiAgZGVidWdsb2coKCk9PiBgbW9kZWxwYXRoIGlzICR7bW9kZWxQYXRofSBgKTtcclxuICB2YXIgbWRscyA9IEZVdGlscy5yZWFkRmlsZUFzSlNPTihtb2RlbFBhdGggKyAnL21vZGVscy5qc29uJyk7XHJcbiAgbWRscy5mb3JFYWNoKG5hbWUgPT4ge1xyXG4gICAgaWYobmFtZSAhPT0gbWFrZU1vbmdvQ29sbGVjdGlvbk5hbWUobmFtZSkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBtb2RlbG5hbWUsIG11c3QgdGVybWluYXRlIHdpdGggcyBhbmQgYmUgbG93ZXJjYXNlJyk7XHJcbiAgICB9XHJcbiAgfSlcclxuICByZXR1cm4gbWRscztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJUmF3U2NoZW1hIHtcclxuICAgIHByb3BzOiBhbnlbXSxcclxuICAgIGluZGV4IDogYW55XHJcbn1cclxuXHJcbi8qXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU1vZGVsRG9jQ2F0ZWdvcnlSZWMge1xyXG4gICAgY2F0ZWdvcnkgOiBzdHJpbmcsXHJcbiAgICBjYXRlZ29yeV9kZXNjcmlwdGlvbiA6IHN0cmluZyxcclxuICAgIFFCRUNvbHVtblByb3BzIDoge1xyXG4gICAgICAgIFwiZGVmYXVsdFdpZHRoXCI6IG51bWJlcixcclxuICAgICAgICBcIlFCRVwiOiBib29sZWFuLFxyXG4gICAgICAgIFwiTFVOUkluZGV4XCI6IGJvb2xlYW5cclxuICAgICAgfSxcclxuICAgICAgXCJjYXRlZ29yeV9zeW5vbnltc1wiOiBzdHJpbmdbXSxcclxuICAgIHdvcmRpbmRleCA6IGJvb2xlYW4sXHJcbiAgICBleGFjdG1hdGNoOiBib29sZWFuLFxyXG4gICAgc2hvd01cclxufTtcclxuKi9cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSU1vZGVsRG9jIHtcclxuICAgIGRvbWFpbiA6IHN0cmluZyxcclxuICAgIG1vZGVsbmFtZT8gOiBzdHJpbmcsXHJcbiAgICBjb2xsZWN0aW9ubmFtZT8gOiBzdHJpbmcsXHJcbiAgICBkb21haW5fZGVzY3JpcHRpb24gOiBzdHJpbmdcclxuICAgIF9jYXRlZ29yaWVzIDogSU1hdGNoLklNb2RlbENhdGVnb3J5UmVjW10sXHJcbiAgICBjb2x1bW5zOiBzdHJpbmdbXSxcclxuICAgIGRvbWFpbl9zeW5vbnltcyA6IHN0cmluZ1tdXHJcblxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElFeHRlbmRlZFNjaGVtYSBleHRlbmRzIElSYXdTY2hlbWF7XHJcbiAgICBkb21haW4gOiBzdHJpbmcsXHJcbiAgICBtb2RlbG5hbWUgOiBzdHJpbmcsXHJcbiAgICBtb25nb29zZW1vZGVsbmFtZSA6IHN0cmluZyxcclxuICAgIGNvbGxlY3Rpb25uYW1lIDogc3RyaW5nXHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWFwVHlwZSh2YWwgOiBzdHJpbmcpIDogYW55IHtcclxuICAgIGlmKHZhbCA9PT0gXCJTdHJpbmdcIikge1xyXG4gICAgICAgIHJldHVybiBTdHJpbmc7XHJcbiAgICB9XHJcbiAgICBpZih2YWwgPT09IFwiQm9vbGVhblwiKSB7XHJcbiAgICAgICAgcmV0dXJuIEJvb2xlYW47XHJcbiAgICB9XHJcbiAgICBpZih2YWwgPT09IFwiTnVtYmVyXCIpIHtcclxuICAgICAgICByZXR1cm4gTnVtYmVyO1xyXG4gICAgfVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiIGlsbGVnYWwgdHlwZSBcIiArIHZhbCArIFwiIGV4cGVjdGVkIFN0cmluZywgQm9vbGVhbiwgTnVtYmVyLCAuLi5cIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZXBsYWNlSWZUeXBlRGVsZXRlTShvYmogOiBhbnksIHZhbCA6IGFueSwga2V5IDogc3RyaW5nKSB7XHJcbiAgICBpZihrZXkuc3Vic3RyKDAsMykgPT09IFwiX21fXCIpIHtcclxuICAgICAgICBkZWxldGUgb2JqW2tleV07XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfTtcclxuICAgIGlmKGtleSA9PT0gXCJ0eXBlXCIgJiYgdHlwZW9mIHZhbCA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgIHZhciByID0gbWFwVHlwZSh2YWwpO1xyXG4gICAgICAgIG9ialtrZXldID0gcjtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhdmVyc2VFeGVjdXRpbmcob2JqLCBmbiApIHtcclxuICAgIF8uZm9ySW4ob2JqLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcclxuICAgIC8vICAgIGNvbnNvbGUubG9nKHZhbCArIFwiIC0+IFwiICsga2V5ICsgXCIgXCIpO1xyXG4gICAgICAgIGZuKG9iaix2YWwsa2V5KTtcclxuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbCkpIHtcclxuICAgICAgICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24oZWwpIHtcclxuICAgICAgICAgICAgICAgIGlmIChfLmlzT2JqZWN0KGVsKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYXZlcnNlRXhlY3V0aW5nKGVsLGZuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfLmlzT2JqZWN0KHZhbCkpIHtcclxuICAgICAgICAgICAgdHJhdmVyc2VFeGVjdXRpbmcob2JqW2tleV0sZm4pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cmF2ZXJzZVJlcGxhY2luZ1R5cGUob2JqKSB7XHJcbiAgICByZXR1cm4gdHJhdmVyc2VFeGVjdXRpbmcob2JqLHJlcGxhY2VJZlR5cGVEZWxldGVNKTtcclxuICAgIC8qXHJcbiAgICBfLmZvckluKG9iaiwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XHJcbiAgICAvLyAgICBjb25zb2xlLmxvZyh2YWwgKyBcIiAtPiBcIiArIGtleSArIFwiIFwiKTtcclxuICAgICAgICByZXBsYWNlSWZUeXBlRGVsZXRlTShvYmosdmFsLGtleSk7XHJcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWwpKSB7XHJcbiAgICAgICAgICAgIHZhbC5mb3JFYWNoKGZ1bmN0aW9uKGVsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoXy5pc09iamVjdChlbCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZVJlcGxhY2luZ1R5cGUoZWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKF8uaXNPYmplY3QodmFsKSkge1xyXG4gICAgICAgICAgICB0cmF2ZXJzZVJlcGxhY2luZ1R5cGUob2JqW2tleV0pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgKi9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVQcm9wcyhhIDogYW55KSA6IGFueSB7XHJcbiAgIHZhciBhQ2xvbmVkID0gXy5jbG9uZURlZXAoYSk7XHJcbiAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYUNsb25lZCwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgIHRyYXZlcnNlUmVwbGFjaW5nVHlwZShhQ2xvbmVkKTtcclxuICAgcmV0dXJuIGFDbG9uZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWtlTW9uZ29vc2VTY2hlbWEoIGV4dFNjaGVtYSA6IElFeHRlbmRlZFNjaGVtYSAsIG1vbmdvPyA6IGFueSkgOiBtb25nb29zZS5TY2hlbWEge1xyXG4gICAgdmFyIHR5cGVkUHJvcHMgPSB0eXBlUHJvcHMoZXh0U2NoZW1hLnByb3BzKTtcclxuICAgIHZhciBtb25nbyA9IG1vbmdvIHx8IG1vbmdvb3NlO1xyXG4gICAgIHZhciBzY2hlbWEgPSBtb25nby5TY2hlbWEoZXh0U2NoZW1hLnByb3BzKTsgLy97IHByb3BzIDogZXh0U2NoZW1hLnByb3BzLCBpbmRleCA6IGV4dFNjaGVtYS5pbmRleCAgfSk7XHJcbiAgICAgc2NoZW1hLmluZGV4KGV4dFNjaGVtYS5pbmRleCk7XHJcbiAgICAgcmV0dXJuIHNjaGVtYTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRFeHRlbmRlZE1vbmdvb3NlU2NoZW1hKG1vZGVsUGF0aDogc3RyaW5nLCBtb2RlbE5hbWUgOiBzdHJpbmcpOiBJRXh0ZW5kZWRTY2hlbWEge1xyXG4gIHZhciBmaWxlbmFtZSA9ICBtb2RlbFBhdGggKyAnLycgKyBtb2RlbE5hbWUgKyAnLm1vZGVsLm1vbmdvb3Nlc2NoZW1hLmpzb24nO1xyXG4gIGRlYnVnbG9nKCgpPT4gYGF0dGVtcHRpbmcgdG8gcmVhZCAke2ZpbGVuYW1lfWApXHJcbiAgdmFyIHNjaGVtYVNlciA9IEZVdGlscy5yZWFkRmlsZUFzSlNPTihmaWxlbmFtZSk7XHJcbiAgc2NoZW1hU2VyLm1vZGVsTmFtZSA9IG1vZGVsTmFtZTtcclxuICByZXR1cm4gc2NoZW1hU2VyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9hZE1vZGVsRG9jKG1vZGVsUGF0aDogc3RyaW5nLCBtb2RlbE5hbWUgOiBzdHJpbmcpOiBJTW9kZWxEb2Mge1xyXG4gIHZhciBkb2NTZXIgPSBGVXRpbHMucmVhZEZpbGVBc0pTT04oIG1vZGVsUGF0aCArICcvJyArIG1vZGVsTmFtZSArICcubW9kZWwuZG9jLmpzb24nKTtcclxuICBkb2NTZXIubW9kZWxuYW1lID0gbW9kZWxOYW1lO1xyXG4gIHJldHVybiBkb2NTZXI7XHJcbn1cclxuXHJcbnZhciBhUHJvbWlzZSA9IGdsb2JhbC5Qcm9taXNlO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJTW9kZWxSZWMgIHtcclxuICAgIGNvbGxlY3Rpb25OYW1lIDogc3RyaW5nLFxyXG4gICAgbW9kZWwgOiBtb25nb29zZS5Nb2RlbDxhbnk+LFxyXG4gICAgc2NoZW1hIDogbW9uZ29vc2UuU2NoZW1hXHJcbn07XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRNb25nb29zZVNjaGVtYSggbW9kZWxEb2MgOiBJTW9kZWxEb2MsIHNjaGVtYVJhdyA6IElSYXdTY2hlbWEpIDogSUV4dGVuZGVkU2NoZW1hIHtcclxuICAgIGRlYnVnbG9nKCAoKT0+J2F1Z21lbnRpbmcgZm9yICcgKyBtb2RlbERvYy5tb2RlbG5hbWUpO1xyXG4gICAgdmFyIHJlcyA9IHsgZG9tYWluIDogbW9kZWxEb2MuZG9tYWluLFxyXG4gICAgICAgIG1vZGVsbmFtZSA6IG1vZGVsRG9jLm1vZGVsbmFtZSxcclxuICAgICAgICBtb25nb29zZW1vZGVsbmFtZSA6IG1ha2VNb25nb29zZU1vZGVsTmFtZShtb2RlbERvYy5tb2RlbG5hbWUpLFxyXG4gICAgICAgIGNvbGxlY3Rpb25uYW1lIDogbWFrZU1vbmdvQ29sbGVjdGlvbk5hbWUobW9kZWxEb2MubW9kZWxuYW1lKVxyXG4gICAgIH0gYXMgSUV4dGVuZGVkU2NoZW1hO1xyXG4gICAgcmV0dXJuIChPYmplY3QgYXMgYW55KS5hc3NpZ24ocmVzLCBzY2hlbWFSYXcpO1xyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJuIGEgbW9kZWxuYW1lXHJcbiAqIEBwYXJhbSBjb2xsZWN0aW9uTmFtZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VNb25nb29zZU1vZGVsTmFtZShjb2xsZWN0aW9uTmFtZSA6IHN0cmluZykgOiBzdHJpbmcge1xyXG4gICAgaWYoY29sbGVjdGlvbk5hbWUgIT09IGNvbGxlY3Rpb25OYW1lLnRvTG93ZXJDYXNlKCkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdCBsb3dlcmNhc2UsIHdhcyAnICsgY29sbGVjdGlvbk5hbWUpO1xyXG4gICAgfVxyXG4gICAgaWYgKGNvbGxlY3Rpb25OYW1lLmNoYXJBdChjb2xsZWN0aW9uTmFtZS5sZW5ndGgtMSkgPT09ICdzJykge1xyXG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uTmFtZTsgLy8gYmV3YXJlLCBBTFRFUkVEIFJFQ0VOVExZIDI4LjA4LjIwMTlcclxuICAgICAgICAvLyByZXR1cm4gY29sbGVjdGlvbk5hbWUuc3Vic3RyaW5nKDAsY29sbGVjdGlvbk5hbWUubGVuZ3RoLTEpO1xyXG4gICAgfVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3RlZCBuYW1lIHdpdGggdHJhaWxpbmcgcycpO1xyXG59XHJcblxyXG4vKipcclxuICogcmV0dXJucyBhIG1vbmdvb3NlIGNvbGxlY3Rpb24gbmFtZVxyXG4gKiBAcGFyYW0gbW9kZWxOYW1lXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFrZU1vbmdvQ29sbGVjdGlvbk5hbWUobW9kZWxOYW1lIDogc3RyaW5nKSA6IHN0cmluZyB7XHJcbiAgICBpZihtb2RlbE5hbWUgIT09IG1vZGVsTmFtZS50b0xvd2VyQ2FzZSgpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3QgbG93ZXJjYXNlLCB3YXMgJyArIG1vZGVsTmFtZSk7XHJcbiAgICB9XHJcbiAgICBpZiAobW9kZWxOYW1lLmNoYXJBdChtb2RlbE5hbWUubGVuZ3RoLTEpICE9PSAncycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJyBleHBlY3QgdHJhaWxpbmcgczonICsgbW9kZWxOYW1lICk7XHJcbiAgICB9XHJcbiAgICBpZiAobW9kZWxOYW1lLmNoYXJBdChtb2RlbE5hbWUubGVuZ3RoLTEpICE9PSAncycpIHtcclxuICAgICAgICByZXR1cm4gbW9kZWxOYW1lICsgJ3MnO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1vZGVsTmFtZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuZGVkU2NoZW1hKG1vbmdvb3NlIDogYW55KSA6IG1vbmdvb3NlLlNjaGVtYSB7XHJcbiAgdmFyIGV4dGVuZFNjaGVtYSA9IG1vbmdvb3NlLlNjaGVtYShFeHRlbmRlZFNjaGVtYV9wcm9wcyk7XHJcbiAgICAvL2NvbnNvbGUubG9nKFwibm93IGV4dGVuZGVkIHNjaGVtYVwiKTtcclxuICAgIGV4dGVuZFNjaGVtYS5pbmRleChFeHRlbmRlZFNjaGVtYV9pbmRleCk7XHJcbiAgICByZXR1cm4gZXh0ZW5kU2NoZW1hO1xyXG4gICAgLy9jb25zb2xlLmxvZygnY3JlYXRpbmcgbW9kZWwgMicpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZW5kZWRTY2hlbWFNb2RlbChtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlKSA6IG1vbmdvb3NlLk1vZGVsPGFueT4ge1xyXG4gICAgdmFyIG1nTW9kZWxOYW1lID0gbWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfRVhURU5ERURTQ0hFTUFTKVxyXG4gICAgaWYobW9uZ29vc2UubW9kZWxOYW1lcygpLmluZGV4T2YobWdNb2RlbE5hbWUpID49IDApIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwobWdNb2RlbE5hbWUpO1xyXG4gICAgfVxyXG4gICAgdmFyIGV4dGVuZFNjaGVtYSA9IGdldEV4dGVuZGVkU2NoZW1hKG1vbmdvb3NlKTtcclxuICAgIHZhciBtb2RlbEVTID0gbW9uZ29vc2UubW9kZWwobWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfRVhURU5ERURTQ0hFTUFTKSwgZXh0ZW5kU2NoZW1hKTtcclxuICAgIHJldHVybiBtb2RlbEVTO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsRG9jTW9kZWwobW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSkgOiBtb25nb29zZS5Nb2RlbDxhbnk+IHtcclxuICAgIHZhciBtZXRhRG9jID0gRlV0aWxzLnJlYWRGaWxlQXNKU09OKCBfX2Rpcm5hbWUgKyAnLy4uLy4uL3Jlc291cmNlcy9tZXRhL21ldGFtb2RlbHMubW9kZWwuZG9jLmpzb24nKTtcclxuICAgIG1ldGFEb2MubW9kZWxuYW1lID0gTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFM7XHJcbiAgICB2YXIgc2NoZW1hU2VyMiA9IGxvYWRFeHRlbmRlZE1vbmdvb3NlU2NoZW1hKF9fZGlybmFtZSArICcvLi4vLi4vcmVzb3VyY2VzL21ldGEnLE1vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTKTtcclxuICAgIHZhciBzY2hlbWFTZXIgPSBhdWdtZW50TW9uZ29vc2VTY2hlbWEobWV0YURvYywgc2NoZW1hU2VyMik7XHJcbiAgICB2YXIgc2NoZW1hID0gbWFrZU1vbmdvb3NlU2NoZW1hKHNjaGVtYVNlciwgbW9uZ29vc2UpO1xyXG4gICAgdmFyIG1vbmdvb3NlTW9kZWxOYW1lID0gbWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfTUVUQU1PREVMUyk7XHJcbiAgICBpZiAobW9uZ29vc2UubW9kZWxOYW1lcygpLmluZGV4T2YobW9uZ29vc2VNb2RlbE5hbWUpID49IDApIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwobW9uZ29vc2VNb2RlbE5hbWUpO1xyXG4gICAgfVxyXG4gICAgdmFyIG1vZGVsRG9jID0gbW9uZ29vc2UubW9kZWwobWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfTUVUQU1PREVMUyksIHNjaGVtYSApO1xyXG4gICAgdmFyIG9GaW5kID0gbW9kZWxEb2MuZmluZDtcclxuICAgICByZXR1cm4gbW9kZWxEb2M7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1cHNlcnRNZXRhTW9kZWwobW9uZ29vc2UgOiBhbnkpIHtcclxuICAgIGRlYnVnbG9nKCgpPT4naGVyZSBkaXJuYW1lICsgJyArIF9fZGlybmFtZSk7XHJcbiAgICB2YXIgbWV0YURvYyA9IEZVdGlscy5yZWFkRmlsZUFzSlNPTihfX2Rpcm5hbWUgKyAnLy4uLy4uL3Jlc291cmNlcy9tZXRhL21ldGFtb2RlbHMubW9kZWwuZG9jLmpzb24nKTtcclxuICAgIGRlYnVnbG9nKCAoKT0+IFwiaGVyZSBtZXRhRG9jIHRvIGluc2VydCBhcyBsb2FkZWRcIiArIEpTT04uc3RyaW5naWZ5KG1ldGFEb2MpKTtcclxuICAgIG1ldGFEb2MubW9kZWxuYW1lID0gTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFM7XHJcbiAgICB2YXIgc2NoZW1hU2VyMiA9IGxvYWRFeHRlbmRlZE1vbmdvb3NlU2NoZW1hKF9fZGlybmFtZSArICcvLi4vLi4vcmVzb3VyY2VzL21ldGEnLE1vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTKTtcclxuICAgIHZhciBzY2hlbWFTZXIgPSBhdWdtZW50TW9uZ29vc2VTY2hlbWEobWV0YURvYywgc2NoZW1hU2VyMik7XHJcblxyXG4gICAgZGVidWdsb2coICgpPT4naGVyZSBzY2hlbWFzZXInICsgSlNPTi5zdHJpbmdpZnkoc2NoZW1hU2VyLHVuZGVmaW5lZCwyKSk7XHJcbiAgICAobW9uZ29vc2UgYXMgYW55KS5Qcm9taXNlID0gZ2xvYmFsLlByb21pc2U7XHJcbiAgICB2YXIgc2NoZW1hID0gbWFrZU1vbmdvb3NlU2NoZW1hKHNjaGVtYVNlciwgbW9uZ29vc2UpO1xyXG4gICAgLy9jb25zb2xlLmxvZyhcIm1ha2Ugc2NoZW1hIDFcIik7XHJcbiAgICAvL3ZhciBleHRlbmRTY2hlbWEgPSBtb25nb29zZS5TY2hlbWEoRXh0ZW5kZWRTY2hlbWFfcHJvcHMpO1xyXG4gICAgLy8vY29uc29sZS5sb2coXCJub3cgZXh0ZW5kZWQgc2NoZW1hXCIpO1xyXG4gICAgLy9leHRlbmRTY2hlbWEuaW5kZXgoRXh0ZW5kZWRTY2hlbWFfaW5kZXgpO1xyXG4gICAgLy9jb25zb2xlLmxvZyhcIm5vdyBkb2N1bWVudCAuLi5cIiArIEpTT04uc3RyaW5naWZ5KGV4dGVuZFNjaGVtYSx1bmRlZmluZWQsMikpO1xyXG4gICAgdmFyIG1vZGVsRG9jID0gbW9uZ29vc2UubW9kZWwobWFrZU1vbmdvb3NlTW9kZWxOYW1lKE1vbmdvTkxRLkNPTExfTUVUQU1PREVMUyksIHNjaGVtYSApO1xyXG4gICAgLy9jb25zb2xlLmxvZygnY3JlYXRpbmcgbW9kZWwgMicpO1xyXG4gICAgdmFyIG1vZGVsRVMgPSBnZXRFeHRlbmRlZFNjaGVtYU1vZGVsKG1vbmdvb3NlKTsgLy9tb25nb29zZS5tb2RlbChtYWtlTW9uZ29vc2VNb2RlbE5hbWUoTW9uZ29OTFEuQ09MTF9FWFRFTkRFRFNDSEVNQVMpLCBleHRlbmRTY2hlbWEpO1xyXG5cclxuICAgIGRlYnVnbG9nKCAoKT0+IFwiaGVyZSBtZXRhRG9jIHRvIGluc2VydFwiICsgSlNPTi5zdHJpbmdpZnkobWV0YURvYykpO1xyXG4gICAgZGVidWdsb2coICgpPT5cImhlcmUgc2NoZW1hc2VyIHRvIGluc2VydFwiICsgSlNPTi5zdHJpbmdpZnkoc2NoZW1hU2VyKSk7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xyXG4gICAgICAgIHZhbGlkYXRlRG9jVnNNb25nb29zZU1vZGVsKG1vZGVsRG9jLCBtZXRhRG9jKS50aGVuKCAoKT0+XHJcbiAgICAgICAgICAgIG1vZGVsRG9jLmZpbmRPbmVBbmRVcGRhdGUoIHsgbW9kZWxuYW1lIDogIE1vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTfSwgbWV0YURvYywge1xyXG4gICAgICAgICAgICAgICAgdXBzZXJ0IDogdHJ1ZVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICksXHJcbiAgICAgICAgdmFsaWRhdGVEb2NWc01vbmdvb3NlTW9kZWwobW9kZWxFUyxzY2hlbWFTZXIpLnRoZW4oICgpPT5cclxuICAgICAgICAgICAgbW9kZWxFUy5maW5kT25lQW5kVXBkYXRlKCB7IG1vZGVsbmFtZSA6ICBNb25nb05MUS5NT0RFTE5BTUVfTUVUQU1PREVMU30sIHNjaGVtYVNlciwge1xyXG4gICAgICAgICAgICAgICAgdXBzZXJ0IDogdHJ1ZVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICldKTsgLy8udGhlbiggKCkgPT4gcHJvY2Vzcy5leGl0KC0xKSk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlREJXaXRoTW9kZWxzKG1vbmdvb3NlIDogbW9uZ29vc2UuTW9uZ29vc2UgLCBtb2RlbFBhdGggOiBzdHJpbmcpIDogUHJvbWlzZTxhbnk+IHtcclxuICAgIHJldHVybiB1cHNlcnRNZXRhTW9kZWwobW9uZ29vc2UpLnRoZW4oXHJcbiAgICAgICAgdXBzZXJ0TW9kZWxzLmJpbmQodW5kZWZpbmVkLCBtb25nb29zZSwgbW9kZWxQYXRoKVxyXG4gICAgKTtcclxufVxyXG5cclxuXHJcbi8vZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsTmFtZXMobW9kZWwgOiBtb25nb29zZS5tb2RlbCwgKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZU90aGVycyhtb25nb29zZSA6IGFueSwgbW9kZWw6IG1vbmdvb3NlLk1vZGVsPGFueT4sIHJldGFpbmVkTmFtZXMgOiBzdHJpbmdbXSApIDogUHJvbWlzZTxhbnk+IHtcclxuICAgIC8vY29uc29sZS5sb2coJ2hlcmUgY29sbGVjdGlvbm5hbWUnICsgT2JqZWN0LmtleXMobW9kZWwpKTtcclxuICAgIC8vY29uc29sZS5sb2coJ2hlcmUgY29sbGVjdGlvbm5hbWUnICsgbW9kZWwuY29sbGVjdGlvbm5hbWUpO1xyXG4gICAgcmV0dXJuIChtb2RlbC5hZ2dyZWdhdGUoW3skcHJvamVjdCA6IHsgbW9kZWxuYW1lIDogMSB9fV0pIGFzIGFueSkudGhlbiggKHIpID0+XHJcbiAgICAgICAgci5tYXAobyA9PiAobyBhcyBhbnkpLm1vZGVsbmFtZSBhcyBzdHJpbmcpXHJcbiAgICApLnRoZW4oIChtb2RlbG5hbWVzIDogYW55KSA9PiB7XHJcbiAgICAgICAgZGVidWdsb2coXCIgcHJlc2VudCBtb2RlbHMgXCIgKyBtb2RlbG5hbWVzLmxlbmd0aCArICcgJyArIG1vZGVsbmFtZXMpO1xyXG4gICAgICAgIHZhciBkZWx0YSA9IF8uZGlmZmVyZW5jZShtb2RlbG5hbWVzLCByZXRhaW5lZE5hbWVzKTtcclxuICAgICAgICBkZWJ1Z2xvZygnIHNwdXJpb3VzIG1vZGVsczogJyArIGRlbHRhLmxlbmd0aCArICcgJyArIGRlbHRhKTtcclxuICAgICAgICBpZihkZWx0YS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGRlbHRhLm1hcCggbW9kZWxuYW1lID0+IChtb2RlbC5kZWxldGVNYW55IGFzIGFueSkoeyBtb2RlbG5hbWUgOiBtb2RlbG5hbWV9KSkpO1xyXG4gICAgfSk7XHJcbn1cclxudmFyIFNjaGVtYU9wZXJhdG9ycyA9IHsgb3BlcmF0b3JzIDoge30sIHN5bm9ueW1zIDoge319O1xyXG5cclxudmFyIFNjaGVtYUZpbGxlcnMgPSB7IGZpbGxlcnMgOiBbe1xyXG4gICAgdHlwZSA6IFN0cmluZ1xyXG59XVxyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE9yQ3JlYXRlTW9kZWxGaWxsZXJzKG1vbmdvb3NlOiBtb25nb29zZS5Nb25nb29zZSkgOiBtb25nb29zZS5Nb2RlbDxhbnk+IHtcclxuICAgIGlmKG1vbmdvb3NlLm1vZGVsTmFtZXMoKS5pbmRleE9mKCdmaWxsZXJzJykgPj0gMCkge1xyXG4gICAgICAgIHJldHVybiBtb25nb29zZS5tb2RlbCgnZmlsbGVycycpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwoJ2ZpbGxlcnMnLCBuZXcgbW9uZ29vc2UuU2NoZW1hKFNjaGVtYUZpbGxlcnMpKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE9yQ3JlYXRlTW9kZWxPcGVyYXRvcnMobW9uZ29vc2U6IG1vbmdvb3NlLk1vbmdvb3NlKSA6IG1vbmdvb3NlLk1vZGVsPGFueT4ge1xyXG4gICAgaWYobW9uZ29vc2UubW9kZWxOYW1lcygpLmluZGV4T2YoJ29wZXJhdG9ycycpID49IDApIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwoJ29wZXJhdG9ycycpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gbW9uZ29vc2UubW9kZWwoJ29wZXJhdG9ycycsIG5ldyBtb25nb29zZS5TY2hlbWEoU2NoZW1hT3BlcmF0b3JzKSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxsZXJzRnJvbURCKCBtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlKSA6IFByb21pc2U8YW55PiB7XHJcbiAgICB2YXIgZmlsbGVyTW9kZWwgPSBnZXRPckNyZWF0ZU1vZGVsRmlsbGVycyhtb25nb29zZSk7XHJcbiAgICByZXR1cm4gZmlsbGVyTW9kZWwuZmluZCh7fSkubGVhbigpLmV4ZWMoKS50aGVuKCAodmFscyA6IGFueVtdKSA9PiB7XHJcbiAgICAgICAgaWYodmFscy5sZW5ndGggIT09IDEpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3RlZCBleGFjdGx5IG9uZSBvcGVyYXRvcnMgZW50cnkgJyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gdmFsc1swXTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE9wZXJhdG9yc0Zyb21EQiggbW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSkgOiBQcm9taXNlPGFueT4ge1xyXG4gICAgdmFyIG9wZXJhdG9yTW9kZWwgPSBnZXRPckNyZWF0ZU1vZGVsT3BlcmF0b3JzKG1vbmdvb3NlKTtcclxuICAgIHJldHVybiBvcGVyYXRvck1vZGVsLmZpbmQoe30pLmxlYW4oKS5leGVjKCkudGhlbiggKHZhbHMgOiBhbnlbXSkgPT4ge1xyXG4gICAgICAgIGlmKHZhbHMubGVuZ3RoICE9PSAxKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignZXhwZWN0ZWQgZXhhY3RseSBvbmUgb3BlcmF0b3JzIGVudHJ5ICcpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHZhbHNbMF07XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuZFNjaGVtYURvY0Zyb21EQihtb25nb29zZSA6IG1vbmdvb3NlLk1vbmdvb3NlLCBtb2RlbE5hbWUgOiBzdHJpbmcpIDogUHJvbWlzZTxJRXh0ZW5kZWRTY2hlbWE+IHtcclxuICAgIHZhciBtb25nb29zZU1vZGVsTmFtZSA9IG1ha2VNb25nb29zZU1vZGVsTmFtZShtb2RlbE5hbWUpO1xyXG4gICAgdmFyIG1vZGVsX0VTID0gbW9uZ29vc2UubW9kZWwoTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICB2YXIgcmVzID0gbW9kZWxfRVMuZmluZCh7IG1vZGVsbmFtZSA6IG1vZGVsTmFtZX0pLmxlYW4oKS5leGVjKCkudGhlbigoZG9jKSA9PlxyXG4gICAgeyAgIGRlYnVnbG9nKCAoKT0+IGAgbG9hZGVkIEVzIGRvYyAke21vZGVsTmFtZX0gcmV0dXJuZWQgJHsoZG9jIGFzIGFueSkubGVuZ3RofSBkb2N1cyBmcm9tIGRiIDogYFxyXG4gICAgICAgICsgKGRvYyBhcyBhbnkpWzBdLm1vZGVsbmFtZSArIGBgICsgKGRvYyBhcyBhbnkpWzBdLmNvbGxlY3Rpb25uYW1lICk7XHJcbiAgICAgICAgZGVidWdsb2coKCkgPT4gJ2hlcmUgdGhlIHJlc3VsdCcgKyBKU09OLnN0cmluZ2lmeShkb2MpKTtcclxuICAgICAgICBpZigoZG9jIGFzIGFueSkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdNb2RlbCAnICsgbW9kZWxOYW1lICsgJyBpcyBub3QgcHJlc2VudCBpbiAnICsgTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBkb2NbMF07XHJcbiAgICB9KTtcclxuICAgIC8vY29uc29sZS5sb2coJ3JlcycgKyB0eXBlb2YgcmVzKTtcclxuICAgIHJldHVybiByZXM7XHJcbiAvLyAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnbW9kZWwgJyArIG1vZGVsTmFtZSArICcgY2Fubm90IGJlIGZvdW5kIG9uIGRiJyk7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxEb2NGcm9tREIobW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSwgbW9kZWxOYW1lIDogc3RyaW5nKSA6IFByb21pc2U8SU1vZGVsRG9jPiB7XHJcbiAgICB2YXIgbW9uZ29vc2VNb2RlbE5hbWUgPSBtYWtlTW9uZ29vc2VNb2RlbE5hbWUobW9kZWxOYW1lKTtcclxuICAgIHZhciBtb2RlbF9FUyA9IG1vbmdvb3NlLm1vZGVsKE1vbmdvb3NlTkxRLk1PTkdPT1NFX01PREVMTkFNRV9FWFRFTkRFRFNDSEVNQVMpO1xyXG4gICAgcmV0dXJuIG1ha2VNb2RlbEZyb21EQihtb25nb29zZSwgTW9uZ29OTFEuTU9ERUxOQU1FX01FVEFNT0RFTFMpLnRoZW4oXHJcbiAgICAgICAgKG1vZGVsKSA9PiBtb2RlbC5maW5kKHsgbW9kZWxuYW1lIDogbW9kZWxOYW1lfSkubGVhbigpLmV4ZWMoKVxyXG4gICAgKS50aGVuKChkb2MpID0+XHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZyggKCk9PiAnIGxvYWRlZCBNb2RlbCBkb2MgJHttb2RlbE5hbWV9IHJldHVybmVkICR7KGRvYyBhcyBhbnkpLmxlbmd0aH0gZG9jdXMgZnJvbSBkYiA6ICdcclxuICAgICAgICAgICAgKyAoZG9jIGFzIGFueSlbMF0ubW9kZWxuYW1lICsgYCBgICsgKGRvYyBhcyBhbnkpWzBdLmNvbGxlY3Rpb25uYW1lICk7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKCdoZXJlIHRoZSByZXN1bHQnICsgSlNPTi5zdHJpbmdpZnkoZG9jKSk7XHJcbiAgICAgICAgICAgIGlmKChkb2MgYXMgYW55KS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKCdNb2RlbCAnICsgbW9kZWxOYW1lICsgJyBpcyBub3QgcHJlc2VudCBpbiAnICsgTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGRvY1swXTtcclxuICAgICAgICB9XHJcbiAgICApO1xyXG4gLy8gICByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ21vZGVsICcgKyBtb2RlbE5hbWUgKyAnIGNhbm5vdCBiZSBmb3VuZCBvbiBkYicpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWFrZU1vZGVsRnJvbURCKG1vbmdvb3NlIDogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVsTmFtZSA6IHN0cmluZykgOiBQcm9taXNlPG1vbmdvb3NlLk1vZGVsPGFueT4+IHtcclxuICAgIHZhciBtb25nb29zZU1vZGVsTmFtZSA9IG1ha2VNb25nb29zZU1vZGVsTmFtZShtb2RlbE5hbWUpO1xyXG4gICAgaWYobW9uZ29vc2UubW9kZWxOYW1lcygpLmluZGV4T2YobW9uZ29vc2VNb2RlbE5hbWUpID49IDApIHtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG1vbmdvb3NlLm1vZGVsKG1vbmdvb3NlTW9kZWxOYW1lKSk7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyggKCk9PidoZXJlIHByZXNlbnQgbW9kZWxuYW1lczogJyArIG1vbmdvb3NlLm1vZGVsTmFtZXMoKS5qb2luKCdcXG4nKSk7XHJcbiAgICB2YXIgbW9kZWxfRVMgPSBtb25nb29zZS5tb2RlbChNb25nb29zZU5MUS5NT05HT09TRV9NT0RFTE5BTUVfRVhURU5ERURTQ0hFTUFTKTtcclxuICAgIGRlYnVnbG9nKCAoKT0+J2hlcmUgbW9kZWxuYW1lOicgKyBtb2RlbE5hbWUpO1xyXG4gICAgdmFyIHJlcyA9IG1vZGVsX0VTLmZpbmQoeyBtb2RlbG5hbWUgOiBtb2RlbE5hbWV9KS5sZWFuKCkuZXhlYygpLnRoZW4oKGRvYykgPT5cclxuICAgIHsgIGRlYnVnbG9nKCAoKT0+YCBsb2FkZWQgTW9kZWwgZG9jICR7bW9kZWxOYW1lfSByZXR1cm5lZCAkeyhkb2MgYXMgYW55KS5sZW5ndGh9IGRvY3VzIGZyb20gZGIgOiBgXHJcbiAgICAgICAgICAgICsgKGRvYyBhcyBhbnkpWzBdLm1vZGVsbmFtZSArIGAgYCArIChkb2MgYXMgYW55KVswXS5jb2xsZWN0aW9ubmFtZSApO1xyXG4gICAgICAgIGRlYnVnbG9nKCAoKT0+J2hlcmUgdGhlIHJlc3VsdCcgKyBKU09OLnN0cmluZ2lmeShkb2MpKTtcclxuICAgICAgICBpZigoZG9jIGFzIGFueSkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdNb2RlbCAnICsgbW9kZWxOYW1lICsgJyBpcyBub3QgcHJlc2VudCBpbiAnICsgTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlYnVnbG9nKCgpPT4gJ2NyZWF0aW5nIHNjaGVtYSBmb3IgJyArIG1vZGVsTmFtZSArICcgZnJvbSAnKTtcclxuICAgICAgICAvLyAgKyBKU09OLnN0cmluZ2lmeShkb2NbMF0pKTtcclxuXHJcbiAgICAgICAgdmFyIHNjaGVtYSA9IG1ha2VNb25nb29zZVNjaGVtYShkb2NbMF0gYXMgSUV4dGVuZGVkU2NoZW1hLG1vbmdvb3NlKTtcclxuICAgICAgICBpZihtb25nb29zZS5tb2RlbE5hbWVzKCkuaW5kZXhPZihtb25nb29zZU1vZGVsTmFtZSkgPj0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG1vbmdvb3NlLm1vZGVsKG1vbmdvb3NlTW9kZWxOYW1lKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKCcgbW9vbmdvb3NlTW9kZWxOYW1lIDogJyArIG1vbmdvb3NlTW9kZWxOYW1lICsgJyAnICsgbW9kZWxOYW1lICk7XHJcbiAgICAgICAgdmFyIG1vZGVsID0gbW9uZ29vc2UubW9kZWwobW9uZ29vc2VNb2RlbE5hbWUsIHNjaGVtYSk7XHJcbiAgICAgICAgZGVidWdsb2coICgpPT4gJ3JldHVybmluZyBtb2RlbDogJyArIG1vZGVsTmFtZSArIGAgYCsgdHlwZW9mIG1vZGVsKTtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG1vZGVsKTtcclxuICAgIH0pO1xyXG4gICAgLy9jb25zb2xlLmxvZygncmVzJyArIHR5cGVvZiByZXMpO1xyXG4gICAgcmV0dXJuIHJlcztcclxuIC8vICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdtb2RlbCAnICsgbW9kZWxOYW1lICsgJyBjYW5ub3QgYmUgZm91bmQgb24gZGInKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVwbG9hZEZpbGxlcnMobW9uZ29vc2U6IG1vbmdvb3NlLk1vbmdvb3NlLCBtb2RlbFBhdGg6IHN0cmluZykgOiBQcm9taXNlPGFueT4ge1xyXG4gICAgdmFyIG1vZGVsRmlsbGVyID0gZ2V0T3JDcmVhdGVNb2RlbEZpbGxlcnMobW9uZ29vc2UpO1xyXG4gICAgcmV0dXJuIG1vZGVsRmlsbGVyLmRlbGV0ZU1hbnkoe30pLnRoZW4oKCkgPT4ge1xyXG4gICAgdmFyIGZpbGxlcnMgPSBGVXRpbHMucmVhZEZpbGVBc0pTT04obW9kZWxQYXRoICsgJy9maWxsZXIuanNvbicpO1xyXG4gICAgICAgIHJldHVybiBuZXcgbW9kZWxGaWxsZXIoeyBmaWxsZXJzOiBmaWxsZXJzfSkuc2F2ZSgpO1xyXG4gICAgfSk7XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHVwbG9hZE9wZXJhdG9ycyhtb25nb29zZTogbW9uZ29vc2UuTW9uZ29vc2UsIG1vZGVsUGF0aDogc3RyaW5nKSA6IFByb21pc2U8YW55PiB7XHJcbiAgICB2YXIgbW9kZWxGaWxsZXIgPSBnZXRPckNyZWF0ZU1vZGVsT3BlcmF0b3JzKG1vbmdvb3NlKTtcclxuICAgIHJldHVybiBtb2RlbEZpbGxlci5kZWxldGVNYW55KHt9KS50aGVuKCgpID0+IHtcclxuICAgIHZhciBvcGVyYXRvcnMgPSBGVXRpbHMucmVhZEZpbGVBc0pTT04obW9kZWxQYXRoICsgJy9vcGVyYXRvcnMuanNvbicpO1xyXG4gICAgcmV0dXJuIG5ldyBtb2RlbEZpbGxlcihvcGVyYXRvcnMpLnNhdmUoKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVQcm9wZXJ0eU5hbWVzKCBtb2RlbERvYyA6IElGTW9kZWwuSU1vZGVsRG9jLCBlc2NoZW1hIDogSUZNb2RlbC5JRXh0ZW5kZWRTY2hlbWEgKSB7XHJcbiAgICBtb2RlbERvYy5fY2F0ZWdvcmllcy5mb3JFYWNoKCBjYXQgPT4ge1xyXG4gICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSBNb25nb01hcC5tYWtlQ2Fub25pY1Byb3BlcnR5TmFtZShjYXQuY2F0ZWdvcnkpOyBcclxuICAgICAgICB2YXIgcHJvcCA9IE1vbmdvTWFwLmZpbmRFc2NoZW1hUHJvcEZvckNhdGVnb3J5KGVzY2hlbWEucHJvcHMsIGNhdC5jYXRlZ29yeSk7XHJcbiAgICAgICAgaWYgKCAhcHJvcCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gZmluZCBwcm9wZXJ0eSBcIiArIHByb3BlcnR5TmFtZSArIFwiIGZvciBjYXRlZ29yeSBcIiArIGNhdC5jYXRlZ29yeSArIFwiIGluIG1vZGVsICBcIiAgICBcclxuICAgICAgICAgICAgKyBtb2RlbERvYy5tb2RlbG5hbWVcclxuICAgICAgICAgICAgKyBcIj5cIiArIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGVzY2hlbWEucHJvcHMpLmpvaW4oXCIsXFxuXCIpICArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkoZXNjaGVtYS5wcm9wcykpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKiBVcGxvYWRzIHRoZSBjb21wbGV0ZSBtb2RlbCAobWV0YWRhdGEhKSBpbmZvcm1hdGlvblxyXG4gKiBBc3N1bWVzIG1ldGFtb2RlbCBoYXMgYmVlbiBsb2FkZWQgKHNlZSAjdXBzZXJ0TWV0YU1vZGVscylcclxuICogQHBhcmFtIG1vbmdvb3NlIHttb25nb29zZS5Nb25nb29zZX0gdGhlIG1vbmdvb3NlIGhhbmRsZVxyXG4gKiBAcGFyYW0gbW9kZWxwYXRoIHtzdHJpbmd9ICB0aGUgbW9kZWwgcGF0aFxyXG4gKiBAcmV0dXJuIFByb21pc2U8YW55PiB0aGUgIHByb21pc2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB1cHNlcnRNb2RlbHMobW9uZ29vc2UgOiBtb25nb29zZS5Nb25nb29zZSwgbW9kZWxwYXRoOiBzdHJpbmcpICA6IFByb21pc2U8YW55PiB7XHJcbiAgICBkZWJ1Z2xvZygoKT0+IGBtb2RlbHBhdGggJHttb2RlbHBhdGh9IGApO1xyXG4gICAgdmFyIG1vZGVsTmFtZXMgPSBsb2FkTW9kZWxOYW1lcyhtb2RlbHBhdGgpO1xyXG4gICAgdmFyIG1vZGVsX0VTID0gbW9uZ29vc2UubW9kZWwoTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX0VYVEVOREVEU0NIRU1BUyk7XHJcbiAgICB2YXIgbW9kZWxfRG9jID0gbW9uZ29vc2UubW9kZWwoTW9uZ29vc2VOTFEuTU9OR09PU0VfTU9ERUxOQU1FX01FVEFNT0RFTFMpO1xyXG4gICAgZGVidWdsb2coJ2hlcmUgbW9kZWxuYW1lcyAnICsgbW9kZWxOYW1lcyk7XHJcbiAgICByZXR1cm4gcmVtb3ZlT3RoZXJzKG1vbmdvb3NlLCBtb2RlbF9FUywgW01vbmdvTkxRLk1PREVMTkFNRV9NRVRBTU9ERUxTXSApLnRoZW4oICgpPT5cclxuICAgICAgICBQcm9taXNlLmFsbChtb2RlbE5hbWVzLm1hcCggKG1vZGVsTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZygndXBzZXJ0aW5nICAnICsgbW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgdmFyIG1vZGVsRG9jID0gbG9hZE1vZGVsRG9jKG1vZGVscGF0aCwgbW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgdmFyIHNjaGVtYVNlciA9IGxvYWRFeHRlbmRlZE1vbmdvb3NlU2NoZW1hKG1vZGVscGF0aCwgbW9kZWxOYW1lKTtcclxuICAgICAgICAgICAgdmFsaWRhdGVQcm9wZXJ0eU5hbWVzKG1vZGVsRG9jLCBzY2hlbWFTZXIpO1xyXG4gICAgICAgICAgICB2YXIgc2NoZW1hRnVsbCA9IGF1Z21lbnRNb25nb29zZVNjaGVtYShtb2RlbERvYywgc2NoZW1hU2VyKTtcclxuICAgICAgICAgICAgZGVidWdsb2coYHVwc2VydGluZyBlc2NoZW1hICR7bW9kZWxOYW1lfSAgd2l0aCBtb2RlbERvY2AgKyBKU09OLnN0cmluZ2lmeShzY2hlbWFGdWxsKSk7XHJcbiAgICAgICAgICAgIHZhciBwMSA9IG1vZGVsX0VTLmZpbmRPbmVBbmRVcGRhdGUoIHsgbW9kZWxuYW1lIDogbW9kZWxOYW1lIH0sIHNjaGVtYUZ1bGwsIHtcclxuICAgICAgICAgICAgICAgIHVwc2VydCA6IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKGB1cHNlcnRpbmcgbW9kZWwgJHttb2RlbE5hbWV9ICB3aXRoIG1vZGVsRG9jYCArIEpTT04uc3RyaW5naWZ5KG1vZGVsRG9jKSk7XHJcbiAgICAgICAgICAgIHZhciBwMiA9IG1vZGVsX0RvYy5maW5kT25lQW5kVXBkYXRlKCB7IG1vZGVsbmFtZSA6IG1vZGVsTmFtZSB9LCBtb2RlbERvYywge1xyXG4gICAgICAgICAgICAgICAgdXBzZXJ0IDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtwMSxwMl0pO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgKVxyXG4gICAgKS50aGVuKCAoKSA9PiB7XHJcbiAgICAgICAgdmFyIG1vZGVsTmFtZXNFeHRlbmRlZCA9IG1vZGVsTmFtZXMuc2xpY2UoKTtcclxuICAgICAgICBtb2RlbE5hbWVzRXh0ZW5kZWQucHVzaChNb25nb05MUS5NT0RFTE5BTUVfTUVUQU1PREVMUyk7XHJcbiAgICAgICAgZGVidWdsb2coJ3JlbW92aW5nIHNwdXJpb3VzIG1vZGVscycpO1xyXG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChbXHJcbiAgICAgICAgICAgIHJlbW92ZU90aGVycyhtb25nb29zZSwgbW9kZWxfRVMsIG1vZGVsTmFtZXNFeHRlbmRlZCApLFxyXG4gICAgICAgICAgICByZW1vdmVPdGhlcnMobW9uZ29vc2UsIG1vZGVsX0RvYywgbW9kZWxOYW1lc0V4dGVuZGVkIClcclxuICAgICAgICBdKTtcclxuICAgIH0pLnRoZW4oICgpID0+IHtcclxuICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtcclxuICAgICAgICAgICAgdXBsb2FkRmlsbGVycyhtb25nb29zZSxtb2RlbHBhdGgpLFxyXG4gICAgICAgICAgICB1cGxvYWRPcGVyYXRvcnMobW9uZ29vc2UsIG1vZGVscGF0aClcclxuICAgICAgICAgXSlcclxuICAgIH0pXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBoYXNNZXRhQ29sbGVjdGlvbihtb25nb29zZSA6IGFueSkgOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBtb25nb29zZS5jb25uZWN0aW9uLmRiLmxpc3RDb2xsZWN0aW9ucygpLnRvQXJyYXkoKGVyciAsbmFtZXMgKSA9PlxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZihuYW1lcy5pbmRleE9mKE1vbmdvTkxRLkNPTExfTUVUQU1PREVMUykgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZWplY3QoXCJkb21haW4gbm90IGxvYWRlZFwiKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgTW9uZ29OTFEgPSB7XHJcbiAgICBNT0RFTE5BTUVfTUVUQU1PREVMUyA6IFwibWV0YW1vZGVsc1wiLFxyXG4gICAgQ09MTF9NRVRBTU9ERUxTIDogXCJtZXRhbW9kZWxzXCIsXHJcbiAgICBDT0xMX0VYVEVOREVEU0NIRU1BUyA6IFwibW9uZ29ubHFfZXNjaGVtYXNcIlxyXG59O1xyXG5cclxuXHJcbmV4cG9ydCBjb25zdCBNb25nb29zZU5MUSA9IHtcclxuICAgIE1PTkdPT1NFX01PREVMTkFNRV9FWFRFTkRFRFNDSEVNQVMgOiBtYWtlTW9uZ29vc2VNb2RlbE5hbWUoTW9uZ29OTFEuQ09MTF9FWFRFTkRFRFNDSEVNQVMpLFxyXG4gICAgTU9OR09PU0VfTU9ERUxOQU1FX01FVEFNT0RFTFMgOiBtYWtlTW9uZ29vc2VNb2RlbE5hbWUoTW9uZ29OTFEuQ09MTF9NRVRBTU9ERUxTKVxyXG59O1xyXG4vKlxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxSZWNCeU1vZGVsTmFtZShtb25nb29zZSA6IGFueSwgbW9kZWxQYXRoOiBzdHJpbmcsIG1vZGVsTmFtZSA6IHN0cmluZykgOiBQcm9taXNlPElNb2RlbFJlYz4gIHtcclxuICAgIC8vIGRvIHdlIGhhdmUgdGhlIG1ldGEgY29sbGVjdGlvbiBpbiB0aGUgZGI/XHJcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xyXG4gICAgICAgIG1vbmdvb3NlLmNvbm5lY3Rpb24uZGJbTW9uZ29OTFEuQ09MTF9NRVRBTU9ERUxTXS5maW5kKHsgbW9kZWxOYW1lIDogbW9kZWxOYW1lfSksXHJcbiAgICAgICAgbW9uZ29vc2UuY29ubmVjdGlvbi5kYltNb25nb05MUS5DT0xMX0VYVEVOREVEU0NIRU1BU10uZmluZCh7IG1vZGVsTmFtZSA6IG1vZGVsTmFtZX0pXHJcbiAgICBdKS50aGVuKHJlcyA9PiB7XHJcbiAgICAgICAgdmFyIG1vZGVsRG9jID0gcmVzWzBdO1xyXG4gICAgICAgIHZhciBleHRlbmRlZFNjaGVtYSA9IHJlc1sxXTtcclxuICAgICAgICB2YXIgc2NoZW1hID0gbWFrZU1vbmdvb3NlU2NoZW1hKGV4dGVuZGVkU2NoZW1hKTtcclxuICAgICAgICB2YXIgbW9kZWwgPSBtb25nb29zZS5tb2RlbChtb2RlbERvYy5jb2xsZWN0aW9uTmFtZSwgc2NoZW1hKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjb2xsZWN0aW9uTmFtZSA6IG1vZGVsRG9jLmNvbGxlY3Rpb25OYW1lLFxyXG4gICAgICAgICAgICBtb2RlbERvYyA6IG1vZGVsRG9jLFxyXG4gICAgICAgICAgICBzY2hlbWEgOiBtYWtlTW9uZ29vc2VTY2hlbWEoZXh0ZW5kZWRTY2hlbWEpLFxyXG4gICAgICAgICAgICBtb2RlbCA6IG1vZGVsXHJcbiAgICAgICAgfSBhcyBJTW9kZWxSZWM7XHJcbiAgICB9KTtcclxufVxyXG4qL1xyXG5cclxuLypcclxuICAgIGhhc01ldGFDb2xsZWN0aW9uKG1vbmdvb3NlKS50aGVuKCAoKSA9PiB7XHJcbiAgICAgICAgbW9uZ29vc2UuY29ubmVjdGlvbi5kYi5tZ25scV9kb21haW5zLmZpbmQoIHtcclxuICAgICAgICAgICAgbW9kZWxOYW1lIDogbW9kZWxOYW1lXHJcbiAgICAgICAgfSkudGhlbiggZG9jID0+IHtcclxuICAgICAgICAgICAgaWYgKGRvYy5zY2hlbWEpXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuICAgIG1vbmdvb3NlLmNvbm5lY3Rpb24uZGIubGlzdENvbGxlY3Rpb25zKCkudG9BcnJheSgoZXJyICxuYW1lcyApID0+XHJcbiAgICB7XHJcbiAgICAgICAgaWYobmFtZXMuaW5kZXhPZihcIm1nbmxxX2RvbWFpbnNcIikgPj0gMCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG4qL1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZURvY01vbmdvb3NlKG1vbmdvb3NlIDogbW9uZ29vc2UuTW9uZ29vc2UsIGNvbGxlY3Rpb25uYW1lLCBzY2hlbWEgOiBtb25nb29zZS5TY2hlbWEsIGRvYyA6IGFueSApIHtcclxuICAgIHZhciBEb2NNb2RlbDtcclxuICAgIC8vY29uc29sZS5sb2coJ3NjaGVtYSAnICsgSlNPTi5zdHJpbmdpZnkoc2NoZW1hKSk7XHJcbiAgICBpZihtb25nb29zZS5tb2RlbE5hbWVzKCkuaW5kZXhPZihjb2xsZWN0aW9ubmFtZSkgPj0gMCkge1xyXG4gICAgICAgIERvY01vZGVsID0gbW9uZ29vc2UubW9kZWwoY29sbGVjdGlvbm5hbWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBEb2NNb2RlbCA9IG1vbmdvb3NlLm1vZGVsKGNvbGxlY3Rpb25uYW1lLCBzY2hlbWEpO1xyXG5cclxuICAgIH1cclxuICAgIHJldHVybiB2YWxpZGF0ZURvY1ZzTW9uZ29vc2VNb2RlbChEb2NNb2RlbCwgZG9jKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlRG9jVnNNb25nb29zZU1vZGVsKG1vZGVsLCBkb2MgOiBhbnkpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxhbnk+KChyZXNvbHZlLHJlamVjdCkgPT4ge1xyXG4gICAgICAgIHZhciB0aGVEb2MgPSBuZXcgbW9kZWwoZG9jKTtcclxuICAgICAgICB0aGVEb2MudmFsaWRhdGUoKGVycikgPT4gIHtcclxuICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhlcnIpO1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmVzb2x2ZSh0aGVEb2MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVEb2MoY29sbGVjdGlvbm5hbWU6IHN0cmluZywgc2NoZW1hIDogbW9uZ29vc2UuU2NoZW1hLCBkb2MgOiBhbnkpIHtcclxuICB2YXIganNvblNjaGVtYVIgPSAoc2NoZW1hIGFzIGFueSkuanNvblNjaGVtYSgpO1xyXG4gIHZhciBqc29uU2NoZW1hID0gXy5jbG9uZURlZXAoanNvblNjaGVtYVIpO1xyXG4gIHRyYXZlcnNlRXhlY3V0aW5nKGpzb25TY2hlbWEsIGZ1bmN0aW9uKG9iaix2YWwsa2V5KSB7XHJcbiAgICBpZihrZXkgPT09ICdwcm9wZXJ0aWVzJyAmJiBvYmoudHlwZSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKCdhdWdtZW50aW5nIHNjaGVtYScpO1xyXG4gICAgICAgIG9iai5hZGRpdGlvbmFsUHJvcGVydGllcyA9IGZhbHNlO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBkZWJ1Z2xvZygoKT0+IGAgaGVyZSBqc29uIHNjaGVtYSBgICsgKEpTT04uc3RyaW5naWZ5KGpzb25TY2hlbWEsdW5kZWZpbmVkLDIpKSk7XHJcbiAgdmFyIFZhbGlkYXRvciA9IHJlcXVpcmUoJ2pzb25zY2hlbWEnKS5WYWxpZGF0b3I7XHJcbiAgdmFyIHYgPSBuZXcgVmFsaWRhdG9yKCk7XHJcbiAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShqc29uU2NoZW1hLHVuZGVmaW5lZCwyKSk7XHJcbiAgdmFyIHZhbHJlc3VsdCA9IHYudmFsaWRhdGUoZG9jLGpzb25TY2hlbWEpO1xyXG4gIGlmKHZhbHJlc3VsdC5lcnJvcnMubGVuZ3RoKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlNjaGVtYSB2YWxpZGF0aW5nIGFnYWluc3QgSlNPTiBTY2hlbWEgZmFpbGVkIDogXCIgKyBKU09OLnN0cmluZ2lmeSh2YWxyZXN1bHQuZXJyb3JzLHVuZGVmaW5lZCwyKSk7XHJcbiAgfVxyXG4gIHJldHVybiB0cnVlO1xyXG59Il19

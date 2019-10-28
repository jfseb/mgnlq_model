"use strict";
/**
 * Functionality to load data into a mongoose model
 * (c) gerd forstmann 2017
 *
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
//import * as intf from 'constants';
const debug = require("debugf");
var debuglog = debug('model');
const FUtils = require("../model/model");
//import {Mongoose as Mongoose} from 'mongoose';
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
/**
 * WATCH out, this instruments mongoose!
 */
require('mongoose-schema-jsonschema')(mongoose);
/**
 * the model path, may be controlled via environment variable
 */
//var envModelPath = process.env["ABOT_MODELPATH"] || "node_modules/abot_testmodel/testmodel";
function cmpTools(a, b) {
    return a.name.localeCompare(b.name);
}
exports.cmpTools = cmpTools;
const SchemaLoad = require("./schemaload");
const MongoUtils = require("../utils/mongo");
/**
 * Create Database (currently does not drop database before!)
 * @param mongoose {mongoose.Mongoose} mongoose instance ( or mock for testing)
 * @param mongoConnectionString {string}  connectionstring, method will connect and disconnect
 * (currenlty disconnnect only on success, subject to change)
 * @param modelPath {string} modepath to read data from
 */
function createDB(mongoose, mongoConnectionString, modelPath) {
    if (modelPath[modelPath.length - 1] === "\\" || modelPath[modelPath.length - 1] === "/") {
        throw new Error(`modelpath should be w.o. trailing "/" or "\\", was ${modelPath} `);
    }
    /**
    * WATCH out, this instruments mongoose!
    */
    require('mongoose-schema-jsonschema')(mongoose);
    return MongoUtils.openMongoose(mongoose, mongoConnectionString).then(() => SchemaLoad.createDBWithModels(mongoose, modelPath)).then(() => {
        var models = SchemaLoad.loadModelNames(modelPath);
        return Promise.all(models.map(modelName => loadModelData(mongoose, modelPath, modelName)));
    }).then(() => {
        MongoUtils.disconnectReset(mongoose);
    });
}
exports.createDB = createDB;
function getModel(mongoose, modelName, modelPath) {
    if (mongoose.models[modelName]) {
        console.log(` got model for ${modelName} `);
        return Promise.resolve(mongoose.models[modelName]);
    }
    console.log(` no model found for ${modelName} `);
    var Eschema = mongoose.models['mongonlq_eschemas'];
    if (!Eschema) {
        throw new Error('this database does not have an eschema model initialized');
    }
    return SchemaLoad.makeModelFromDB(mongoose, modelName);
}
exports.getModel = getModel;
function loadModelData(mongoose, modelPath, modelName) {
    var data = FUtils.readFileAsJSON(modelPath + '/' + modelName + '.data.json');
    var cnt = 0;
    // load the schema, either from database or from file system
    return getModel(mongoose, modelName, modelPath).then(oModel => {
        console.log('** got a model to load: ' + oModel.modelName);
        return Promise.all(data.map((oRecord, index) => {
            try {
                return SchemaLoad.validateDoc(oModel.modelName, oModel.schema, oRecord);
            }
            catch (err) {
                console.log('error validation object ' + modelName + ' record #' + index);
                throw err;
            }
        })).then(() => { return oModel; });
    }).then(oModel2 => {
        return Promise.all(data.map((oRecord, index) => SchemaLoad.validateDocMongoose(mongoose, oModel2.modelName, oModel2.schema, oRecord))).then(() => { return oModel2; });
    }).then((oModel) => {
        return oModel.remove({}).then(() => oModel)
            .then(oModel => {
            return Promise.all(data.map(doc => {
                var oDoc = new oModel(doc);
                return oDoc.save().then(a => { ++cnt; }).catch(err => console.log("error inserting " + err + "  inserting : " + JSON.stringify(doc) + ""));
            }));
        }).then(() => oModel);
    }).then(oModel => {
        console.log(`inserted ${cnt} documents for domain ${modelName}`);
    }).catch(err => {
        console.log(`error inserting documents for domain ${modelName}\n` + err + err.stack);
    });
}
exports.loadModelData = loadModelData;
mongoose.Promise = global.Promise;
function deleteAll(model) {
    return model.collection.drop();
}

//# sourceMappingURL=dataload.js.map

/**
 * Functionality to load data into a mongoose model
 * (c) gerd forstmann 2017
 *
 * @file
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//import * as intf from 'constants';
const debug = require("debugf");
var debuglog = debug('model');
const FUtils = require("../model/model");
//import * as CircularSer from 'abot_utils';
//import * as Distance from 'abot_stringdist';
const process = require("process");
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
var envModelPath = process.env["ABOT_MODELPATH"] || "node_modules/abot_testmodel/testmodel";
function cmpTools(a, b) {
    return a.name.localeCompare(b.name);
}
exports.cmpTools = cmpTools;
const SchemaLoad = require("./schemaload");
function getModel(mongoose, modelName, modelPath) {
    if (mongoose.models[modelName]) {
        return Promise.resolve(mongoose.models[modelName]);
    }
    var Eschema = mongoose.models['mongonlq_eschema'];
    if (!Eschema) {
        throw new Error('this database does not have an eschema model initialized');
    }
    return SchemaLoad.makeModelFromDB(mongoose, modelName);
}
exports.getModel = getModel;
function loadModelData(mongoose, modelPath, modelName) {
    var data = FUtils.readFileAsJSON('./' + modelPath + './' + modelName + '.data.json');
    var cnt = 0;
    // load the schema, either from database or from file system
    return getModel(mongoose, modelName, modelPath).then(oModel => {
        console.log('** got a model' + oModel.modelName);
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

"use strict";
/**
 * Functionality to load data into a mongoose model
 * (c) gerd forstmann 2017
 *
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadModelData = exports.getModel = exports.createDB = exports.cmpTools = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWxvYWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxsb2FkL2RhdGFsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBRUgsb0NBQW9DO0FBQ3BDLGdDQUFnQztBQUVoQyxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFTOUIseUNBQXlDO0FBTXpDLGdEQUFnRDtBQUNoRCxxQ0FBcUM7QUFDcEMsUUFBZ0IsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUMzQzs7R0FFRztBQUNILE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hEOztHQUVHO0FBQ0gsOEZBQThGO0FBRTlGLFNBQWdCLFFBQVEsQ0FBQyxDQUFlLEVBQUUsQ0FBZTtJQUN2RCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRkQsNEJBRUM7QUFRRCwyQ0FBNEM7QUFFNUMsNkNBQTZDO0FBRTdDOzs7Ozs7R0FNRztBQUNILFNBQWdCLFFBQVEsQ0FBQyxRQUE0QixFQUFFLHFCQUE4QixFQUFFLFNBQWlCO0lBQ3BHLElBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRztRQUNqRixNQUFNLElBQUksS0FBSyxDQUFDLHNEQUFzRCxTQUFTLEdBQUcsQ0FBQyxDQUFDO0tBQ3ZGO0lBQ0o7O01BRUU7SUFDQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVoRCxPQUFPLFVBQVUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLHFCQUFxQixDQUFDLENBQUMsSUFBSSxDQUFFLEdB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
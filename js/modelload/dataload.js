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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWxvYWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxsb2FkL2RhdGFsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHOzs7QUFFSCxvQ0FBb0M7QUFDcEMsZ0NBQWdDO0FBRWhDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQVM5Qix5Q0FBeUM7QUFFekMsNENBQTRDO0FBQzVDLDhDQUE4QztBQUM5QyxtQ0FBbUM7QUFFbkMsZ0RBQWdEO0FBQ2hELHFDQUFxQztBQUNwQyxRQUFnQixDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQzNDOztHQUVHO0FBQ0gsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEQ7O0dBRUc7QUFDSCxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksdUNBQXVDLENBQUM7QUFFNUYsa0JBQXlCLENBQWUsRUFBRSxDQUFlO0lBQ3ZELE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEMsQ0FBQztBQUZELDRCQUVDO0FBUUQsMkNBQTRDO0FBRTVDLGtCQUF5QixRQUFhLEVBQUUsU0FBaUIsRUFBRSxTQUFpQjtJQUN6RSxFQUFFLENBQUEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUNELElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUNsRCxFQUFFLENBQUEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7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
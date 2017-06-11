"use strict";
/**
 * create the db, loading models from
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Schemaload = require("./modelload/schemaload");
const Dataload = require("./modelload/dataload");
const MongoUtils = require("./utils/mongo");
// var FUtils = require(root + '/model/model.js')
const mongoose = require('mongoose');
var mongoConnectionString = process.env.MONGO_DBURL || 'mongodb://localhost/testdb';
var modelPath = process.env.MGNLQ_MODELPATH || 'node_modules/mgnlq_testmodel/testmodel/';
console.log(" uploading data into \n" +
    "from ModelPath: " + modelPath
    + " to     MongoDB: " + mongoConnectionString);
MongoUtils.openMongoose(mongoose, mongoConnectionString).then(() => Schemaload.createDBWithModels(mongoose, modelPath)).then(() => {
    var models = Schemaload.loadModelNames(modelPath);
    return Promise.all(models.map(modelName => Dataload.loadModelData(mongoose, modelPath, modelName)));
}).then(() => {
    MongoUtils.disconnectReset(mongoose);
});

//# sourceMappingURL=makedb.js.map

"use strict";
/**
 * create the db, loading models from
 */
exports.__esModule = true;
var Schemaload = require("./modelload/schemaload");
var Dataload = require("./modelload/dataload");
var MongoUtils = require("./utils/mongo");
// var FUtils = require(root + '/model/model.js')
var mongoose = require('mongoose');
var mongoConnectionString = process.env.MONGO_DBURL || 'mongodb://localhost/testdb';
var modelPath = process.env.MGNLQ_MODELPATH || 'node_modules/mgnlq_testmodel/testmodel/';
console.log(" uploading data into \n" +
    "from ModelPath: " + modelPath
    + " to     MongoDB: " + mongoConnectionString);
MongoUtils.openMongoose(mongoose, mongoConnectionString).then(function () {
    return Schemaload.createDBWithModels(mongoose, modelPath);
}).then(function () {
    var models = Schemaload.loadModelNames(modelPath);
    return Promise.all(models.map(function (modelName) { return Dataload.loadModelData(mongoose, modelPath, modelName); }));
}).then(function () {
    MongoUtils.disconnectReset(mongoose);
});

//# sourceMappingURL=makedb.js.map

//# sourceMappingURL=makedb.js.map

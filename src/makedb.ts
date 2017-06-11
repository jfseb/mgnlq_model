/**
 * create the db, loading models from
 */


import * as Schemaload from './modelload/schemaload';
import * as Dataload from './modelload/dataload';

import * as MongoUtils from './utils/mongo';
// var FUtils = require(root + '/model/model.js')
const mongoose = require('mongoose');


var mongoConnectionString = process.env.MONGO_DBURL || 'mongodb://localhost/testdb';
var modelPath = process.env.MGNLQ_MODELPATH  || 'node_modules/mgnlq_testmodel/testmodel/';
console.log(" uploading data into \n" +
             "from ModelPath: " + modelPath
+           " to     MongoDB: " + mongoConnectionString
           );
MongoUtils.openMongoose(mongoose, mongoConnectionString).then( () =>
    Schemaload.createDBWithModels(mongoose, modelPath)
).then( ()=> {
    var models = Schemaload.loadModelNames(modelPath);
    return Promise.all(models.map(modelName => Dataload.loadModelData(mongoose,modelPath, modelName)));
}).then( () => {
     MongoUtils.disconnectReset(mongoose);
});

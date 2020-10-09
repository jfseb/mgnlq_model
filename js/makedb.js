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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFrZWRiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL21ha2VkYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7O0FBR0gscURBQXFEO0FBQ3JELGlEQUFpRDtBQUVqRCw0Q0FBNEM7QUFDNUMsaURBQWlEO0FBQ2pELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUdyQyxJQUFJLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLDRCQUE0QixDQUFDO0FBQ3BGLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxJQUFLLHlDQUF5QyxDQUFDO0FBQzFGLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCO0lBQ3hCLGtCQUFrQixHQUFHLFNBQVM7TUFDL0IsbUJBQW1CLEdBQUcscUJBQXFCLENBQzNDLENBQUM7QUFDYixVQUFVLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLElBQUksQ0FBRSxHQUFHLEVBQUUsQ0FDaEUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FDckQsQ0FBQyxJQUFJLENBQUUsR0FBRSxFQUFFO0lBQ1IsSUFBSSxNQUFNLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFFLEdBQUcsRUFBRTtJQUNULFVBQVUsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMifQ==
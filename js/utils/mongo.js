/**
 * Utiltities for mongo
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debugf = require("debugf");
var debuglog = debugf('model');
function openMongoose(mongoose, mongoConnectionString) {
    mongoose.connect(mongoConnectionString || 'mongodb://localhost/nodeunit');
    var db = mongoose.connection;
    var mgopen = new Promise(function (resolve, reject) {
        //db.on.setMaxListeners(0);
        if ((typeof db.on.setMaxListeners) === "function") {
            db.on.setMaxListeners(0);
        }
        db.on('error', (err) => {
            console.error(err);
            reject(err);
        });
        if ((typeof db.once.setMaxListeners) === "function") {
            db.once.setMaxListeners(0);
        }
        db.once('open', function () {
            debuglog('connected to ' + mongoConnectionString);
            resolve(db);
        });
    });
    return mgopen;
}
exports.openMongoose = openMongoose;
function clearModels(mongoose) {
    mongoose.connection.modelNames().forEach(modelName => delete mongoose.connection.models[modelName]);
}
exports.clearModels = clearModels;
function disconnect(mongoose) {
    if (mongoose.connection.readyState > 0) {
        mongoose.disconnect();
    }
}
exports.disconnect = disconnect;
function disconnectReset(mongoose) {
    clearModels(mongoose);
    disconnect(mongoose);
}
exports.disconnectReset = disconnectReset;
function getCollectionNames(mongoose) {
    return mongoose.connection.db.collections().then((cols) => cols.map(col => col.collectionName));
}
exports.getCollectionNames = getCollectionNames;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvbW9uZ28udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7OztBQUVILGlDQUFpQztBQUNqQyxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFL0Isc0JBQTZCLFFBQWEsRUFBRSxxQkFBOEI7SUFFeEUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsSUFBSSw4QkFBOEIsQ0FBQyxDQUFDO0lBQzFFLElBQUksRUFBRSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUM7SUFDN0IsSUFBSSxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUNoRCwyQkFBMkI7UUFDM0IsRUFBRSxDQUFBLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztZQUMvQyxFQUFFLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBQ0QsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHO1lBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQUEsQ0FBQyxDQUNkLENBQUM7UUFDRixFQUFFLENBQUEsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2pELEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLENBQUM7UUFDRCxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNkLFFBQVEsQ0FBQyxlQUFlLEdBQUcscUJBQXFCLENBQUMsQ0FBQztZQUNsRCxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBdEJELG9DQXNCQztBQUVELHFCQUE0QixRQUFjO0lBQ3RDLFFBQVEsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFDOUMsT0FBTyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FDL0MsQ0FBQztBQUNOLENBQUM7QUFKRCxrQ0FJQztBQUVELG9CQUEyQixRQUFjO0lBQ3JDLEVBQUUsQ0FBQSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzFCLENBQUM7QUFDTCxDQUFDO0FBSkQsZ0NBSUM7QUFFRCx5QkFBZ0MsUUFBYztJQUMxQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdEIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3pCLENBQUM7QUFIRCwwQ0FHQztBQUVELDRCQUFtQyxRQUFhO0lBQzVDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQzVDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FDaEQsQ0FBQztBQUNOLENBQUM7QUFKRCxnREFJQyJ9
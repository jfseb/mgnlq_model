"use strict";
/**
 * Utiltities for mongo
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollectionNames = exports.disconnectReset = exports.disconnect = exports.clearModels = exports.openMongoose = void 0;
const debugf = require("debugf");
var debuglog = debugf('model');
function openMongoose(mongoose, mongoConnectionString) {
    console.log(' mongoose.connect ' + mongoConnectionString);
    mongoose.connect(mongoConnectionString || 'mongodb://localhost/nodeunit', {
        useFindAndModify: true,
        useUnifiedTopology: true,
        useNewUrlParser: true /*useMongoClient : true*/
    }); // .then( a => console.log('mongoose connect ok'))
    var db = mongoose.connection;
    var mgopen = new Promise(function (resolve, reject) {
        //db.on.setMaxListeners(0);
        if ((typeof db.setMaxListeners) === "function") {
            db.setMaxListeners(0);
        }
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
    debuglog(' clear Models ');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvbW9uZ28udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCxpQ0FBaUM7QUFDakMsSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRS9CLFNBQWdCLFlBQVksQ0FBQyxRQUFhLEVBQUUscUJBQThCO0lBQ3hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEdBQUcscUJBQXFCLENBQUUsQ0FBQztJQUMzRCxRQUFRLENBQUMsT0FBTyxDQUFDLHFCQUFxQixJQUFJLDhCQUE4QixFQUN4RTtRQUNJLGdCQUFnQixFQUFHLElBQUk7UUFDdkIsa0JBQWtCLEVBQUUsSUFBSTtRQUN4QixlQUFlLEVBQUUsSUFBSSxDQUFBLHlCQUF5QjtLQUFFLENBQUMsQ0FBQyxDQUFDLGtEQUFrRDtJQUN6RyxJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDO0lBQzdCLElBQUksTUFBTSxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsT0FBTyxFQUFFLE1BQU07UUFDaEQsMkJBQTJCO1FBQzNCLElBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsS0FBSyxVQUFVLEVBQUU7WUFDM0MsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN6QjtRQUNELElBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEtBQUssVUFBVSxFQUFFO1lBQzlDLEVBQUUsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzVCO1FBQ0QsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNyQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUFBLENBQUMsQ0FDZCxDQUFDO1FBQ0YsSUFBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxVQUFVLEVBQUU7WUFDaEQsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUI7UUFDRCxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNkLFFBQVEsQ0FBQyxlQUFlLEdBQUcscUJBQXFCLENBQUMsQ0FBQztZQUNsRCxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQTdCRCxvQ0E2QkM7QUFFRCxTQUFnQixXQUFXLENBQUMsUUFBYztJQUN0QyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUMzQixRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUNqRCxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUMvQyxDQUFDO0FBQ04sQ0FBQztBQUxELGtDQUtDO0FBRUQsU0FBZ0IsVUFBVSxDQUFDLFFBQWM7SUFDckMsSUFBRyxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUU7UUFDbkMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO0tBQ3pCO0FBQ0wsQ0FBQztBQUpELGdDQUlDO0FBRUQsU0FBZ0IsZUFBZSxDQUFDLFFBQWM7SUFDMUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN6QixDQUFDO0FBSEQsMENBR0M7QUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxRQUFhO0lBQzVDLE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUM1QyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FDaEQsQ0FBQztBQUNOLENBQUM7QUFKRCxnREFJQyJ9
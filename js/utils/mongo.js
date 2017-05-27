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

//# sourceMappingURL=mongo.js.map

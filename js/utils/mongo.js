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

//# sourceMappingURL=mongo.js.map

//# sourceMappingURL=mongo.js.map

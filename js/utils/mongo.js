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
        useFindAndModify: false,
        useUnifiedTopology: true,
        useNewUrlParser: true /*useMongoClient : true*/,
        useCreateIndex: true
    }); // .then( a => console.log('mongoose connect ok'))
    //TODO   
    //  mongoose.set('useCreateIndex', true); // DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead. #6890
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQ2hELENBQUM7QUFDTixDQUFDO0FBSkQsZ0RBSUMiLCJmaWxlIjoidXRpbHMvbW9uZ28uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVXRpbHRpdGllcyBmb3IgbW9uZ29cclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1Z2YgZnJvbSAnZGVidWdmJztcclxudmFyIGRlYnVnbG9nID0gZGVidWdmKCdtb2RlbCcpO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG9wZW5Nb25nb29zZShtb25nb29zZTogYW55LCBtb25nb0Nvbm5lY3Rpb25TdHJpbmcgOiBzdHJpbmcpIHtcclxuICBjb25zb2xlLmxvZygnIG1vbmdvb3NlLmNvbm5lY3QgJyArIG1vbmdvQ29ubmVjdGlvblN0cmluZyApO1xyXG4gIG1vbmdvb3NlLmNvbm5lY3QobW9uZ29Db25uZWN0aW9uU3RyaW5nIHx8ICdtb25nb2RiOi8vbG9jYWxob3N0L25vZGV1bml0JyxcclxuICB7XHJcbiAgICAgIHVzZUZpbmRBbmRNb2RpZnkgOiBmYWxzZSwgIC8vaHR0cHM6Ly9tb25nb29zZWpzLmNvbS9kb2NzL2RlcHJlY2F0aW9ucy5odG1sIy1maW5kYW5kbW9kaWZ5LVxyXG4gICAgICB1c2VVbmlmaWVkVG9wb2xvZ3k6IHRydWUsXHJcbiAgICAgIHVzZU5ld1VybFBhcnNlcjogdHJ1ZS8qdXNlTW9uZ29DbGllbnQgOiB0cnVlKi8gXHJcbiAgICAgICx1c2VDcmVhdGVJbmRleCA6IHRydWUgfSk7IC8vIC50aGVuKCBhID0+IGNvbnNvbGUubG9nKCdtb25nb29zZSBjb25uZWN0IG9rJykpXHJcblxyXG4gIC8vVE9ETyAgIFxyXG4gLy8gIG1vbmdvb3NlLnNldCgndXNlQ3JlYXRlSW5kZXgnLCB0cnVlKTsgLy8gRGVwcmVjYXRpb25XYXJuaW5nOiBjb2xsZWN0aW9uLmVuc3VyZUluZGV4IGlzIGRlcHJlY2F0ZWQuIFVzZSBjcmVhdGVJbmRleGVzIGluc3RlYWQuICM2ODkwXHJcbiAgdmFyIGRiID0gbW9uZ29vc2UuY29ubmVjdGlvbjtcclxuICB2YXIgbWdvcGVuID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgLy9kYi5vbi5zZXRNYXhMaXN0ZW5lcnMoMCk7XHJcbiAgICBpZigodHlwZW9mIGRiLnNldE1heExpc3RlbmVycykgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIGRiLnNldE1heExpc3RlbmVycygwKTtcclxuICAgIH1cclxuICAgIGlmKCh0eXBlb2YgZGIub24uc2V0TWF4TGlzdGVuZXJzKSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgZGIub24uc2V0TWF4TGlzdGVuZXJzKDApO1xyXG4gICAgfVxyXG4gICAgZGIub24oJ2Vycm9yJywgKGVycikgPT4ge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XHJcbiAgICAgIHJlamVjdChlcnIpO31cclxuICAgICk7XHJcbiAgICBpZigodHlwZW9mIGRiLm9uY2Uuc2V0TWF4TGlzdGVuZXJzKSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgZGIub25jZS5zZXRNYXhMaXN0ZW5lcnMoMCk7XHJcbiAgICB9XHJcbiAgICBkYi5vbmNlKCdvcGVuJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICBkZWJ1Z2xvZygnY29ubmVjdGVkIHRvICcgKyBtb25nb0Nvbm5lY3Rpb25TdHJpbmcpO1xyXG4gICAgICByZXNvbHZlKGRiKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIHJldHVybiBtZ29wZW47XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjbGVhck1vZGVscyhtb25nb29zZSA6IGFueSkge1xyXG4gICAgZGVidWdsb2coJyBjbGVhciBNb2RlbHMgJyk7XHJcbiAgICBtb25nb29zZS5jb25uZWN0aW9uLm1vZGVsTmFtZXMoKS5mb3JFYWNoKG1vZGVsTmFtZSA9PlxyXG4gICAgICAgIGRlbGV0ZSBtb25nb29zZS5jb25uZWN0aW9uLm1vZGVsc1ttb2RlbE5hbWVdXHJcbiAgICApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZGlzY29ubmVjdChtb25nb29zZSA6IGFueSkge1xyXG4gICAgaWYobW9uZ29vc2UuY29ubmVjdGlvbi5yZWFkeVN0YXRlID4gMCkge1xyXG4gICAgICAgIG1vbmdvb3NlLmRpc2Nvbm5lY3QoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRpc2Nvbm5lY3RSZXNldChtb25nb29zZSA6IGFueSkge1xyXG4gICAgY2xlYXJNb2RlbHMobW9uZ29vc2UpO1xyXG4gICAgZGlzY29ubmVjdChtb25nb29zZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2xsZWN0aW9uTmFtZXMobW9uZ29vc2U6IGFueSkgOiBQcm9taXNlPFN0cmluZ1tdPiB7XHJcbiAgICByZXR1cm4gbW9uZ29vc2UuY29ubmVjdGlvbi5kYi5jb2xsZWN0aW9ucygpLnRoZW4oXHJcbiAgICAgICAgKGNvbHMpID0+IGNvbHMubWFwKGNvbCA9PiBjb2wuY29sbGVjdGlvbk5hbWUpXHJcbiAgICApO1xyXG59Il19

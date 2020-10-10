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
        /*, useCreateIndex : true**/ 
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUNoRCxDQUFDO0FBQ04sQ0FBQztBQUpELGdEQUlDIiwiZmlsZSI6InV0aWxzL21vbmdvLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFV0aWx0aXRpZXMgZm9yIG1vbmdvXHJcbiAqL1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWdmIGZyb20gJ2RlYnVnZic7XHJcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnZignbW9kZWwnKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBvcGVuTW9uZ29vc2UobW9uZ29vc2U6IGFueSwgbW9uZ29Db25uZWN0aW9uU3RyaW5nIDogc3RyaW5nKSB7XHJcbiAgY29uc29sZS5sb2coJyBtb25nb29zZS5jb25uZWN0ICcgKyBtb25nb0Nvbm5lY3Rpb25TdHJpbmcgKTtcclxuICBtb25nb29zZS5jb25uZWN0KG1vbmdvQ29ubmVjdGlvblN0cmluZyB8fCAnbW9uZ29kYjovL2xvY2FsaG9zdC9ub2RldW5pdCcsXHJcbiAge1xyXG4gICAgICB1c2VGaW5kQW5kTW9kaWZ5IDogdHJ1ZSwgIC8vaHR0cHM6Ly9tb25nb29zZWpzLmNvbS9kb2NzL2RlcHJlY2F0aW9ucy5odG1sIy1maW5kYW5kbW9kaWZ5LVxyXG4gICAgICB1c2VVbmlmaWVkVG9wb2xvZ3k6IHRydWUsXHJcbiAgICAgIHVzZU5ld1VybFBhcnNlcjogdHJ1ZS8qdXNlTW9uZ29DbGllbnQgOiB0cnVlKi8gXHJcbiAgICAgIC8qLCB1c2VDcmVhdGVJbmRleCA6IHRydWUqKi8gfSk7IC8vIC50aGVuKCBhID0+IGNvbnNvbGUubG9nKCdtb25nb29zZSBjb25uZWN0IG9rJykpXHJcblxyXG4gIC8vVE9ETyAgIFxyXG4gLy8gIG1vbmdvb3NlLnNldCgndXNlQ3JlYXRlSW5kZXgnLCB0cnVlKTsgLy8gRGVwcmVjYXRpb25XYXJuaW5nOiBjb2xsZWN0aW9uLmVuc3VyZUluZGV4IGlzIGRlcHJlY2F0ZWQuIFVzZSBjcmVhdGVJbmRleGVzIGluc3RlYWQuICM2ODkwXHJcbiAgdmFyIGRiID0gbW9uZ29vc2UuY29ubmVjdGlvbjtcclxuICB2YXIgbWdvcGVuID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgLy9kYi5vbi5zZXRNYXhMaXN0ZW5lcnMoMCk7XHJcbiAgICBpZigodHlwZW9mIGRiLnNldE1heExpc3RlbmVycykgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIGRiLnNldE1heExpc3RlbmVycygwKTtcclxuICAgIH1cclxuICAgIGlmKCh0eXBlb2YgZGIub24uc2V0TWF4TGlzdGVuZXJzKSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgZGIub24uc2V0TWF4TGlzdGVuZXJzKDApO1xyXG4gICAgfVxyXG4gICAgZGIub24oJ2Vycm9yJywgKGVycikgPT4ge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XHJcbiAgICAgIHJlamVjdChlcnIpO31cclxuICAgICk7XHJcbiAgICBpZigodHlwZW9mIGRiLm9uY2Uuc2V0TWF4TGlzdGVuZXJzKSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgZGIub25jZS5zZXRNYXhMaXN0ZW5lcnMoMCk7XHJcbiAgICB9XHJcbiAgICBkYi5vbmNlKCdvcGVuJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICBkZWJ1Z2xvZygnY29ubmVjdGVkIHRvICcgKyBtb25nb0Nvbm5lY3Rpb25TdHJpbmcpO1xyXG4gICAgICByZXNvbHZlKGRiKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIHJldHVybiBtZ29wZW47XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjbGVhck1vZGVscyhtb25nb29zZSA6IGFueSkge1xyXG4gICAgZGVidWdsb2coJyBjbGVhciBNb2RlbHMgJyk7XHJcbiAgICBtb25nb29zZS5jb25uZWN0aW9uLm1vZGVsTmFtZXMoKS5mb3JFYWNoKG1vZGVsTmFtZSA9PlxyXG4gICAgICAgIGRlbGV0ZSBtb25nb29zZS5jb25uZWN0aW9uLm1vZGVsc1ttb2RlbE5hbWVdXHJcbiAgICApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZGlzY29ubmVjdChtb25nb29zZSA6IGFueSkge1xyXG4gICAgaWYobW9uZ29vc2UuY29ubmVjdGlvbi5yZWFkeVN0YXRlID4gMCkge1xyXG4gICAgICAgIG1vbmdvb3NlLmRpc2Nvbm5lY3QoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRpc2Nvbm5lY3RSZXNldChtb25nb29zZSA6IGFueSkge1xyXG4gICAgY2xlYXJNb2RlbHMobW9uZ29vc2UpO1xyXG4gICAgZGlzY29ubmVjdChtb25nb29zZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2xsZWN0aW9uTmFtZXMobW9uZ29vc2U6IGFueSkgOiBQcm9taXNlPFN0cmluZ1tdPiB7XHJcbiAgICByZXR1cm4gbW9uZ29vc2UuY29ubmVjdGlvbi5kYi5jb2xsZWN0aW9ucygpLnRoZW4oXHJcbiAgICAgICAgKGNvbHMpID0+IGNvbHMubWFwKGNvbCA9PiBjb2wuY29sbGVjdGlvbk5hbWUpXHJcbiAgICApO1xyXG59Il19

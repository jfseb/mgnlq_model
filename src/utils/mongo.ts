/**
 * Utiltities for mongo
 */

import * as debugf from 'debugf';
var debuglog = debugf('model');

export function openMongoose(mongoose: any, mongoConnectionString : string) {
  console.log(' mongoose.connect ' + mongoConnectionString );
  mongoose.connect(mongoConnectionString || 'mongodb://localhost/nodeunit',
  {
      useFindAndModify : false,  //https://mongoosejs.com/docs/deprecations.html#-findandmodify-
      useUnifiedTopology: true,
      useNewUrlParser: true/*useMongoClient : true*/ 
      ,useCreateIndex : true }); // .then( a => console.log('mongoose connect ok'))

  //TODO   
 //  mongoose.set('useCreateIndex', true); // DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead. #6890
  var db = mongoose.connection;
  var mgopen = new Promise(function (resolve, reject) {
    //db.on.setMaxListeners(0);
    if((typeof db.setMaxListeners) === "function") {
        db.setMaxListeners(0);
    }
    if((typeof db.on.setMaxListeners) === "function") {
        db.on.setMaxListeners(0);
    }
    db.on('error', (err) => {
      console.error(err);
      reject(err);}
    );
    if((typeof db.once.setMaxListeners) === "function") {
        db.once.setMaxListeners(0);
    }
    db.once('open', function () {
      debuglog('connected to ' + mongoConnectionString);
      resolve(db);
    });
  });
  return mgopen;
}

export function clearModels(mongoose : any) {
    debuglog(' clear Models ');
    mongoose.connection.modelNames().forEach(modelName =>
        delete mongoose.connection.models[modelName]
    );
}

export function disconnect(mongoose : any) {
    if(mongoose.connection.readyState > 0) {
        mongoose.disconnect();
    }
}

export function disconnectReset(mongoose : any) {
    clearModels(mongoose);
    disconnect(mongoose);
}

export function getCollectionNames(mongoose: any) : Promise<String[]> {
    return mongoose.connection.db.collections().then(
        (cols) => cols.map(col => col.collectionName)
    );
}
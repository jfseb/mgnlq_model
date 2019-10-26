/**
 * Utiltities for mongo
 */

import * as debugf from 'debugf';
var debuglog = debugf('model');

export function openMongoose(mongoose: any, mongoConnectionString : string) {
  console.log(' mongoose.connect ' + mongoConnectionString );
  mongoose.connect(mongoConnectionString || 'mongodb://localhost/nodeunit', { useUnifiedTopology: true, useNewUrlParser: true/*useMongoClient : true*/ }); // .then( a => console.log('mongoose connect ok'))
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
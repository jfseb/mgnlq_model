/*! copyright gerd forstmann, all rights reserved */
// var debug = require('debug')('appdata.nunit')
/* tests which run with a working db instance */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../js';

// var Model = require(root + '/model/model.js')
// var Meta = require(root + '/model/meta.js')

var debuglog = require('debugf')('testdb.schemaload.nunit.js');

var Schemaload = require(root + '/modelload/schemaload.js');

const MongoUtils = require(root + '/utils/mongo.js');
// var FUtils = require(root + '/model/model.js')
const mongoose = require('mongoose');

function openMongoose () {
  mongoose.connect('mongodb://localhost/nodeunit');
  var db = mongoose.connection;
  var mgopen = new Promise(function (resolve, reject) {
    db.on('error', (err) => {
      console.error(err);
      reject(err);}
    );
    db.once('open', function () {
      // we're connected!
      /*
      console.log('mongoose connection in open ' + Object.keys(mongoose.connection.db));
      console.log('mongoose connection in open2 ' + typeof (mongoose.connection.db.collections));
      console.log('mongoose connection in open3 ' + typeof (mongoose.connection.db.getCollectionNames));

      console.log('here model names : ' + db.modelNames());
      console.log('now model names : ' + db.modelNames());
      console.log('done');
      */
      resolve(db);
    });
  });
  return mgopen;
}

function openEmptyMongoose() {
  return openMongoose().then( () => {
    return MongoUtils.getCollectionNames(mongoose);
  }
  ).then( colNames => {
    debuglog(colNames);
    return Promise.all( colNames.map(colName => mongoose.connection.db.collection(colName).drop()));
  }
  );
}


process.on('unhandledRejection', function onError(err) {
  console.log(err);
  console.log(err.stack);
  throw err;
});

var modelPath = 'node_modules/mgnlq_testmodel/testmodel/';
/**
 * Unit test for sth
 */
exports.testSchemaLoad = function (test) {
  test.expect(1);
  var res = Schemaload.loadModelNames(modelPath);
  test.deepEqual(res, [ 'iupacs',
    'philoelements',
    'cosmos',
    'r3trans',
    'fioriapps',
    'sobj_tables',
    'fioribecatalogs' ]);
  test.done();
};

process.on('unhandledRejection', function onError (err) {
  console.log(err);
  console.log(err.stack());
  throw err;
});

exports.testInsertMetaModel = function (test) {
  test.expect(4);
  openEmptyMongoose().then(function () {
    Schemaload.upsertMetaModel(mongoose).then(
      function () {
        //   console.log('conn '+ Object.keys(mongoose.connection).join('\n'))
        //   console.log('conn.collections:\n' + Object.keys(mongoose.connection.collections).join('\n'))
        //   console.log('db ='+ Object.keys(mongoose.connection.db).join('\n'))
        /* var p1 = mongoose.model('mongonlq_eschema').count({},function(err, a) {
           test.equal(a,1, 'correct count')
         })
         */
        var p1 = mongoose.connection.db.collection('mongonlq_eschemas').count({}).then((cnt) => {
          debuglog('count by native ' + cnt);
          test.equal(cnt, 1);
        });
        var p2 = mongoose.model('mongonlq_eschema').count({}).then((cnt) => {
          debuglog('here count 2 ' + cnt);
          test.equal(cnt, 1);
          return true;
        });
        var p3 = mongoose.model('mongonlq_eschema').find({}).then((a2) => {
          debuglog('a1m' + JSON.stringify(a2) + ' ' + a2.length);
          test.equal(a2[0].collectionname, 'metamodels');
          return true;
        });
        var p4 = mongoose.connection.db.collection('metamodels').count({ modelname: 'metamodels'}).then((cnt) => {
          debuglog('count by native ' + cnt);
          test.equal(cnt, 1);
        });
        Promise.all([p1, p2, p3, p4]).then(() => {
          MongoUtils.disconnectReset(mongoose);
          test.done();
          mongoose.modelNames().forEach(modelname => delete mongoose.connection.models[modelname]);
          mongoose.disconnect();
        });
        /*
                mongoose.connection.db.collection('userCollection').insert({
                  username: 'user1',
                  firstName: 'Steve',
                  lastName: 'LastName',
                })
                console.log ( ' get  a schema ' + Schemaload.MongoNLQ.COLL_EXTENDEDSCHEMAS)
                var r = mongoose.connection.db.collection('mongonlq_eschemas').find({}, function(err, res) {
                  console.log(JSON.stringify(res) + JSON.stringify(err))
                  test.done()

                })
                console.log(' here result : ' + r)
          */
        /*    console.log('what is this ' + mongoose.connection.db.collection('mongonlq_eschemas').find({}).toArray( (e,s) =>
            {
              console.log('here arr' + s)
              return s
              }
            ))
             var r =  mongoose.connection.db.collection('Schemaload.MongoNLQ.COLL_EXTENDEDSCHEMAS').find({
           //   modelname : Schemaload.MongoNLQ.MODELNAME_META
              }).toArray()
              */
        // console.log(`here our r` + JSON.stringify(r))

      }
    ).catch((err) => {
      console.log('test failed ' + err + '\n' + err.stack);
      test.equal(0, 1);
      test.done();
    });
  });
};

exports.testCreateDB = function (test) {
  test.expect(5);
  openEmptyMongoose().then(function () {
    return Schemaload.createDBWithModels(mongoose,modelPath);
  }).then(() =>
    {
    var p2 = mongoose.model('mongonlq_eschema').count({}).then((cnt) => {
      test.equal(cnt, 8, 'eschemas via model');
      return true;
    });
    var p1 = mongoose.connection.db.collection('mongonlq_eschemas').count({}).then((cnt) => {
      test.equal(cnt, 8, ' eschemas native ');
    });
    var p3 = mongoose.model('mongonlq_eschema').find({ modelname: 'metamodels' }).then((a2) => {
      debuglog('a1mm' + JSON.stringify(a2.map(a2 => a2.modelname)) + ' ' + a2.length);
      test.equal(a2[0].collectionname, 'metamodels');
      test.equal(a2[0].mongoosemodelname, 'metamodel');
      return true;
    });
    var p4 = mongoose.connection.db.collection('metamodels').count({ modelname: 'metamodels' }).then((cnt) => {
      test.equal(cnt, 1, ' domains native');
    });
    return Promise.all([p1, p2, p3, p4]).then(() => {
      MongoUtils.disconnectReset(mongoose);
      test.done();
    });
    }).catch((err) => {
      console.log(err);
      console.log('**test failed ' + err + '\n' + err.stack);
      test.equal(0, 1);
      test.done();
    });
};

exports.testInsertModels = function (test) {
  test.expect(5);
  openEmptyMongoose().then(function () {
    Schemaload.upsertMetaModel(mongoose).then(() => {
      return Schemaload.upsertModels(mongoose, modelPath);
    }).then(() => {
      /*   console.log('conn '+ Object.keys(mongoose.connection).join('\n'))
       //   console.log('conn.collections:\n' + Object.keys(mongoose.connection.collections).join('\n'))
       //   console.log('db ='+ Object.keys(mongoose.connection.db).join('\n'))
       /* var p1 = mongoose.model('mongonlq_eschema').count({},function(err, a) {
          test.equal(a,1, 'correct count')
        })
        */

      var p2 = mongoose.model('mongonlq_eschema').count({}).then((cnt) => {
        test.equal(cnt, 8, ' eschemas via model');
        return true;
      });
      var p1 = mongoose.connection.db.collection('mongonlq_eschemas').count({}).then((cnt) => {
        test.equal(cnt, 8, ' eschemas native ');
      });
      var p3 = mongoose.model('mongonlq_eschema').find({ modelname: 'metamodels' }).then((a2) => {
        debuglog('a1mm' + JSON.stringify(a2.map(a2 => a2.modelname)) + ' ' + a2.length);
        test.equal(a2[0].collectionname, 'metamodels');
        test.equal(a2[0].mongoosemodelname, 'metamodel');
        return true;
      });
      var p4 = mongoose.connection.db.collection('metamodels').count({ modelname: 'metamodels'}).then((cnt) => {
        test.equal(cnt, 1,' domains native');
      });
      Promise.all([p1, p2, p3, p4]).then(() => {
        MongoUtils.disconnectReset(mongoose);
        test.done();
      });
      /*
              mongoose.connection.db.collection('userCollection').insert({
                username: 'user1',
                firstName: 'Steve',
                lastName: 'LastName',
              })
              console.log ( ' get  a schema ' + Schemaload.MongoNLQ.COLL_EXTENDEDSCHEMAS)
              var r = mongoose.connection.db.collection('mongonlq_eschemas').find({}, function(err, res) {
                console.log(JSON.stringify(res) + JSON.stringify(err))
                test.done()

              })
              console.log(' here result : ' + r)
        */
      /*    console.log('what is this ' + mongoose.connection.db.collection('mongonlq_eschemas').find({}).toArray( (e,s) =>
          {
            console.log('here arr' + s)
            return s
            }
          ))
           var r =  mongoose.connection.db.collection('Schemaload.MongoNLQ.COLL_EXTENDEDSCHEMAS').find({
         //   modelname : Schemaload.MongoNLQ.MODELNAME_META
            }).toArray()
            */
      // console.log(`here our r` + JSON.stringify(r))

    }).catch((err) => {
      console.log(err);
      console.log('**test failed ' + err + '\n' + err.stack);
      test.equal(0, 1);
      test.done();
    });
  });
};

exports.testMakeModelFromDBFail = function (test) {
  test.expect(1);
  openEmptyMongoose().then(function () {
    return Schemaload.createDBWithModels(mongoose,modelPath);
  }).then( ()=> {
    return Schemaload.makeModelFromDB(mongoose,'fiorixxapps');
  }
  ).catch( (err) => {
    test.equal(1,1);
    MongoUtils.disconnectReset(mongoose);
    test.done();
  });
};

exports.testmakeModelFromDBModelPresent = function (test) {
  test.expect(1);
  openEmptyMongoose().then(function () {
    return Schemaload.createDBWithModels(mongoose,modelPath);
  }).then( ()=> {
    console.log(`here keys: ` + Object.keys(mongoose.connection.models));
    return Schemaload.makeModelFromDB(mongoose,'metamodels');
  }).then((model) => {
      console.log(Object.keys(model));
      test.equal(model.modelName, 'metamodel');
      test.done();
      MongoUtils.disconnectReset(mongoose);
  }).catch( (err) => {
      test.equals(0,1);
      test.done();
      MongoUtils.disconnectReset(mongoose);
  });
};

exports.testmakeModelFromDBModelCreating = function (test) {
  test.expect(1);
  openEmptyMongoose().then(function () {
    return Schemaload.createDBWithModels(mongoose,modelPath);
  }).then( ()=> {
    console.log(Object.keys(mongoose.connection.models));
    return Schemaload.makeModelFromDB(mongoose,'fioriapps');
  }).then((model) => {
      test.equal(model.modelName, 'fioriapp');
      test.done();
      MongoUtils.disconnectReset(mongoose);
  }).catch( (err) => {
    console.log(err);
    console.log(err.stack);
      test.equals(0,1);
      test.done();
      MongoUtils.disconnectReset(mongoose);
  });
};



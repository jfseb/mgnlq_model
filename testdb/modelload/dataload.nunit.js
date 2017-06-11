/*! copyright gerd forstmann, all rights reserved */
// var debug = require('debug')('appdata.nunit')
/* tests which run with a working db instance */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../js';

// var Model = require(root + '/model/model.js')
// var Meta = require(root + '/model/meta.js')

var debuglog = require('debugf')('testdb.dataload.nunit.js');

var Schemaload = require(root + '/modelload/schemaload.js');

var Dataload = require(root + '/modelload/dataload.js');

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
    console.log(colNames);
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

process.on('unhandledRejection', function onError (err) {
  console.log(err);
  console.log(err.stack());
  throw err;
});

exports.testCreateDBThrowsBadModelPath = function (test) {
  test.expect(2);
  try{
    Dataload.createDB(undefined,'localhost:somedb' ,'abc/');
    test.equal(1,0);
  } catch (e) {
    test.equal(1,1);
    test.equal(( '' + e ).indexOf('trailing') > 0, true);
  }
  test.done();
}

exports.testmakeModelFromLoadData  = function (test) {
  test.expect(1);
  openEmptyMongoose().then(function () {
    return Schemaload.createDBWithModels(mongoose,modelPath);
  }).then( ()=> {
    console.log(Object.keys(mongoose.connection.models));
    return Dataload.loadModelData(mongoose,modelPath, 'fioriapps');
  }).then((model) => {
    var p2 = mongoose.model('fioriapp').count({}).then((cnt) => {
      debuglog('here count 2 ' + cnt);
      test.equal(cnt, 14);
      return true;
    });
    Promise.all([p2]).then(() => {
      MongoUtils.disconnectReset(mongoose);
      test.done();
    });
  }).catch( (err) => {
    console.log(err);
    console.log(err.stack);
    test.equals(0, 1);
    test.done();
    MongoUtils.disconnectReset(mongoose);
  });
};

exports.testmakeModelLoadFullData = function (test) {
  test.expect(1);
  openEmptyMongoose().then(function () {
    return Schemaload.createDBWithModels(mongoose,modelPath);
  }).then( ()=> {
    console.log(Object.keys(mongoose.connection.models));
    return Dataload.loadModelData(mongoose,modelPath, 'sobj_tables');
  }).then((model) => {
    var p2 = mongoose.model('sobj_table').count({}).then((cnt) => {
      debuglog('here count 2 ' + cnt);
      test.equal(cnt, 7);
      return true;
    });
    var p1 = mongoose.model('sobj_table').find().distinct('_tables.Table').exec().then((res) => {
      console.log('here res of query  Table: ' + JSON.stringify(res));
    });
    var p4 = mongoose.model('sobj_table').distinct('Shorttext', {}).exec().then((res) => {
      console.log('here res of query ShortText: ' + JSON.stringify(res));
    });
    var p5 = mongoose.model('sobj_table').find({}).lean().exec().then((res) => {
      console.log('here res of queryfull : ' + JSON.stringify(res));
    });
    var p3 = mongoose.model('sobj_table').distinct('TransportObject', {}).exec().then((res) => {
      console.log('here res of query OBJ: ' + JSON.stringify(res));
    });
    Promise.all([p1, p2, p3, p4, p5]).then(() => {
      MongoUtils.disconnectReset(mongoose);
      test.done();
    });
  }).catch( (err) => {
    console.log(err);
    console.log(err.stack);
      test.equals(0,1);
      test.done();
      MongoUtils.disconnectReset(mongoose);
  });
};
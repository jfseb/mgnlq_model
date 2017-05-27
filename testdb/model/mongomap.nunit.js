/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('appdata.nunit');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../js';
var debuglog = require('debugf')('testdb.mongomap.nunit.js');

var MongoMap = require(root + '/model/mongomap.js');
var Model = require(root + '/model/model.js');

//var modelPath = 'node_modules/testmodel/';

var testmodelPath = 'node_modules/mgnlq_testmodel/testmodel/';

var Schemaload = require(root + '/modelload/schemaload.js');
var MongoUtils  = require(root + '/utils/mongo.js');
var eSchemaSOBJ_Tables = Schemaload.loadExtendedMongooseSchema(testmodelPath, 'sobj_tables');
var eDocSOBJ = Schemaload.loadModelDoc(testmodelPath, 'sobj_tables');

// load distinct values from model

process.on('unhandledRejection', function onError(err) {
  console.log(err);
  console.log(err.stack);
  throw err;
});

var connectionStringTestDB = "mongodb://localhost/testdb";
  //  mongoose.connect('mongodb://localhost/nodeunit');


exports.testGetDistintMultivalues = function(test) {
  MongoUtils.openMongoose(mongoose, connectionStringTestDB).then( () =>
  {
    return Model.getMongoHandle(mongoose);
  }
  ).then( (modelHandle) => {
    //modelHandle.getModel(mongoose,'cosmos');
    return modelHandle;
  }).then( (modelHandle) =>
    Model.getDistinctValues(modelHandle, 'metamodels' , 'domain synonyms')
  )
  .then( (values) => {
    test.deepEqual(values, [ 'meta model', 'fiori bom' ]);
    MongoUtils.disconnectReset(mongoose);
          test.done();
      }
    ).catch((err) => {
      console.log('test failed ' + err + '\n' + err.stack);
      test.equal(0, 1);
      test.done();
    });
};

exports.testGetDistintCosmos = function(test) {
  MongoUtils.openMongoose(mongoose, connectionStringTestDB).then( () =>
  {
    return Model.getMongoHandle(mongoose);
  }
  ).then( (modelHandle) => {
    //modelHandle.getModel(mongoose,'cosmos');
    return modelHandle;
  }).then( (modelHandle) =>
    Model.getDistinctValues(modelHandle, 'cosmos' , 'orbits')
  )
  .then( (values) => {
    test.deepEqual(values, [null, 'Alpha Centauri C', 'Sun', 'n/a']);
    MongoUtils.disconnectReset(mongoose);
          test.done();
      }
    ).catch((err) => {
      console.log('test failed ' + err + '\n' + err.stack);
      test.equal(0, 1);
      test.done();
    });
};

exports.testGetDistintObjectName = function(test) {
  MongoUtils.openMongoose(mongoose, connectionStringTestDB).then( () =>
  {
    return Model.getMongoHandle(mongoose);
  }
  ).then( (modelHandle) => {
    //modelHandle.getModel(mongoose,'cosmos');
    return modelHandle;
  }).then( (modelHandle) =>
    Model.getDistinctValues(modelHandle, 'cosmos' , 'object name')
  )
  .then( (values) => {
    test.deepEqual(values, [ 'Alpha Centauri A',
  'Alpha Centauri B',
  'Alpha Centauri C',
  'Mars',
  'Proxima Centauri b',
  'Sun',
  'earth' ]);
    MongoUtils.disconnectReset(mongoose);
          test.done();
      }
    ).catch((err) => {
      console.log('test failed ' + err + '\n' + err.stack);
      test.equal(0, 1);
      test.done();
    });
};


exports.testMakeIfMap = function(test) {
  var res = MongoMap.makeMongoMap(eDocSOBJ, eSchemaSOBJ_Tables);
  test.deepEqual(res['TransportObject'],
   { path: ['TransportObject'], fullpath : 'TransportObject'});
  test.deepEqual(res['Object name length'], { path: ['Object_name_length'], fullpath : 'Object_name_length'});
  test.deepEqual(res['Table'], { path: ['_tables', '[]', 'Table'], fullpath : '_tables.Table'});
  test.deepEqual(1,1);
  test.done();
};

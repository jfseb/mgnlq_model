/*! copyright gerd forstmann, all rights reserved */
// var debug = require('debug')('appdata.nunit')
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../js';

// var Model = require(root + '/model/model.js')
// var Meta = require(root + '/model/meta.js')

var Schemaload = require(root + '/modelload/schemaload.js');
var FUtils = require(root + '/model/model.js');

// var fs = require('fs')

var modelPath = 'node_modules/mgnlq_testmodel/testmodel/';
/**
 * Unit test for sth
 */
exports.testSchemaLoadNames = function (test) {
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


exports.testmapType = function (test) {
  test.expect(3);
  [ { input: 'String' , expected : String},
   { input: 'Boolean' , expected : Boolean},
   { input: 'Number' , expected : Number}
  ].forEach(function(fixture) {
    var res = Schemaload.mapType(fixture.input);
    test.equal(res,fixture.expected);
  });
  test.done();
};

exports.testReplaceIfTypeRemoveM = function (test) {
  var obj = { _m_abc: 1};
  Schemaload.replaceIfTypeDeleteM(obj, 1, '_m_abc');
  test.deepEqual(obj, { });
  test.done();
};

exports.testmapTypeThrows = function (test) {
  test.expect(1);
  try {
    Schemaload.mapType('notype');
    test.equal(1,0);
  } catch (e) {
    test.equal(1,1);
  }
  test.done();
};

/**
 * Unit test for sth
 */
exports.testTypeProps = function (test) {
  test.expect(1);
  var res = Schemaload.typeProps({
    'object_name': {
      'type': 'String',
      'trim': true,
      '_m_category': 'object name',
      'index': true
    }
  });

  test.deepEqual(res, {
    'object_name': {
      'type': String,
      'trim': true,
      'index': true
    }
  });
  test.done();
};

var mongoose = require('mongoose');
//var mongoose = require('mongoose_record_replay').instrumentMongoose(require('mongoose'), 'node_modules/mgnql_testmodel_replay/mgrecrep/',"REPLAY");


exports.testSchemaLoad = function (test) {
  test.expect(2);
  var extschema = Schemaload.loadExtendedMongooseSchema(modelPath, 'sobj_tables');
  var schema = Schemaload.makeMongooseSchema(extschema);
  try {
    Schemaload.validateDoc(mongoose,  'abcx', schema, { 'TransportObject' : 'SOBJ', TranslationRelevant :  40 });
    test.equal(0,1);
  } catch(e) {
    test.equal(1,1);
  }
  Schemaload.validateDoc( 'sobj_tables', schema, { 'TransportObject' : 'SOBJ', TranslationRelevant : true, _tables : [ { 'Table' : 'ABC' } ] });
  test.equal(1,1);
  test.done();
};
/*
exports.testSchemaValidateMongoose = function (test) {
  test.expect(1);
  var extschema = Schemaload.loadExtendedMongooseSchema(modelPath, 'sobj_tables');
  var schema = Schemaload.makeMongooseSchema(extschema);
  var p = Schemaload.validateDocMongoose(mongoose, 'abc', schema, { 'TransportObject' : 'SOBJ', TranslationRelevant :  40, _tables : {} });
  p.catch( err => {
    test.equal(1,1);
    test.done();
  });
  p.then(
      ok => {
        test.equal(1,0);
        test.done();
      });
};*/


exports.testSchemaValidateOwnDocVsSchemaOk = function (test) {
  test.expect(1);
  var extschema = Schemaload.loadExtendedMongooseSchema('resources/meta', 'metamodels');
  var doc = FUtils.readFileAsJSON('./resources/meta/metamodels.model.doc.json');
  var schema = Schemaload.makeMongooseSchema(extschema);
  Schemaload.validateDocMongoose(mongoose, 'meta', schema, doc ).then(
      ok => {
        test.equal(1,1);
        test.done();
      }).catch( err => {
        test.equal(1,0);
        test.done();
      });
};

exports.testSchemaLoadOwn = function (test) {
  test.expect(1);
  var extschema = Schemaload.loadExtendedMongooseSchema('resources/meta', 'metamodels');
  var doc = FUtils.readFileAsJSON('./resources/meta/metamodels.model.doc.json');
  var schema = Schemaload.makeMongooseSchema(extschema);
  Schemaload.validateDoc( 'metamodel', schema, doc);
  test.equal(1,1);

  test.done();
};





exports.testSchemaValidateMongooseOk = function (test) {
  test.expect(1);
  var extschema = Schemaload.loadExtendedMongooseSchema(modelPath, 'sobj_tables');
  var schema = Schemaload.makeMongooseSchema(extschema);
  Schemaload.validateDocMongoose(mongoose, 'sobj_tables', schema, { 'TransportObject' : 'SOBJ', TranslationRelevant :  'abc', _tables : [ { 'Table' : 'ABC' } ] }).then(
      ok => {
        test.equal(1,1);
        test.done();
      }).catch( err => {
        test.equal(1,0);
        test.done();
      });
};

exports.testmakeMongooseCollName = function (test) {
  test.expect(1);
  var res = Schemaload.makeMongoCollectionName('abc');
  test.equal(res, 'abcs');
  test.done();
};

exports.testmakeMongooseCollName2 = function (test) {
  test.expect(1);
  var res = Schemaload.makeMongoCollectionName('abcs');
  test.equal(res, 'abcs');
  test.done();
};


exports.testmakeMongooseCollName = function (test) {
  test.expect(1);
  var res = Schemaload.makeMongooseModelName('abcs');
  test.equal(res, 'abc');
  test.done();
};

exports.testmakeMongooseCollNameThrows = function (test) {
  test.expect(1);
  try {
    Schemaload.makeMongooseCollectionName('abc');
    test.equaL(1,0);
  } catch(e) {
    test.equal(1,1);
  }
  test.done();
};

exports.testLoadModelNames = function (test) {
  test.expect(1);
  var res = Schemaload.loadModelNames('node_modules/mgnlq_testmodel/testmodel/');
  test.deepEqual(res, [ 'iupacs',
  'philoelements',
  'cosmos',
  'r3trans',
  'fioriapps',
  'sobj_tables',
  'fioribecatalogs' ]);
  test.done();
};

exports.testGetModelDocModel = function(test) {


  var mongooseMock = {
    models : {},
    model : function(a, b) {
      if(b) {
        this.models[a] = { modelName : a,
          Schema : b} ;
      }
      return this.models[a];
    },
    Schema : mongoose.Schema,
    modelNames : function() {
      return Object.keys(this.models);
    }
  };


  var res = Schemaload.getModelDocModel(mongooseMock);
  test.equal(typeof res, 'object');
  test.deepEqual(mongooseMock.modelNames(), ['metamodel']);
  test.done();
};

/*
exports.testInsertMetaModel = function (test) {
  test.expect(4);
  openFakeMongoose().then(function () {
    Schemaload.upsertMetaModel(mongoose).then(
      function () {
        //   console.log('conn '+ Object.keys(mongoose.connection).join('\n'))
        //   console.log('conn.collections:\n' + Object.keys(mongoose.connection.collections).join('\n'))
        //   console.log('db ='+ Object.keys(mongoose.connection.db).join('\n'))
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
        // console.log(`here our r` + JSON.stringify(r))

      }
    ).catch((err) => {
      console.log('test failed ' + err + '\n' + err.stack);
      test.equal(0, 1);
      test.done();
    });
  });
};
*/
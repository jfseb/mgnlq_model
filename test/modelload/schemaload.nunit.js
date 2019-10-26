/*! copyright gerd forstmann, all rights reserved */
// var debug = require('debug')('appdata.nunit')
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../js';

// var Model = require(root + '/model/model.js')
// var Meta = require(root + '/model/meta.js')

var Schemaload = require(root + '/modelload/schemaload.js');
var FUtils = require(root + '/model/model.js');

var debuglog = require('debugf')('schemaload.nunit.js');
//var sinon = require('sinon');
// var fs = require('fs')

var modelPath = 'node_modules/mgnlq_testmodel/testmodel/';
/**
 * Unit test for sth
 */
exports.testSchemaLoadNames = function (test) {
  test.expect(1);
  var res = Schemaload.loadModelNames(modelPath);
  test.deepEqual(res, ['iupacs',
    'philoelements',
    'cosmos',
    'r3trans',
    'fioriapps',
    'sobj_tables',
    'fioribecatalogs']);
  test.done();
};

// load distinct values from model

process.on('unhandledRejection', function onError(err) {
  console.log(err);
  console.log(err.stack);
  throw err;
});


exports.testmapType = function (test) {
  test.expect(3);
  [
    { input: 'String', expected: String },
    { input: 'Boolean', expected: Boolean },
    { input: 'Number', expected: Number }
  ].forEach(function (fixture) {
    var res = Schemaload.mapType(fixture.input);
    test.equal(res, fixture.expected);
  });
  test.done();
};

exports.testReplaceIfTypeRemoveM = function (test) {
  var obj = { _m_abc: 1 };
  Schemaload.replaceIfTypeDeleteM(obj, 1, '_m_abc');
  test.deepEqual(obj, {});
  test.done();
};

exports.testmapTypeThrows = function (test) {
  test.expect(1);
  try {
    Schemaload.mapType('notype');
    test.equal(1, 0);
  } catch (e) {
    test.equal(1, 1);
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
    Schemaload.validateDoc(mongoose, 'abcx', schema, { 'TransportObject': 'SOBJ', TranslationRelevant: 40 });
    test.equal(0, 1);
  } catch (e) {
    test.equal(1, 1);
  }
  Schemaload.validateDoc('sobj_tables', schema, { 'TransportObject': 'SOBJ', TranslationRelevant: true, _tables: [{ 'Table': 'ABC' }] });
  test.equal(1, 1);
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
  Schemaload.validateDocMongoose(mongoose, 'meta', schema, doc).then(
    ok => {
      test.equal(1, 1);
      test.done();
    }).catch(err => {
      test.equal(1, 0);
      test.done();
    });
};

exports.testSchemaLoadOwn = function (test) {
  test.expect(1);
  var extschema = Schemaload.loadExtendedMongooseSchema('resources/meta', 'metamodels');
  var doc = FUtils.readFileAsJSON('./resources/meta/metamodels.model.doc.json');
  var schema = Schemaload.makeMongooseSchema(extschema);
  Schemaload.validateDoc('metamodel', schema, doc);
  test.equal(1, 1);

  test.done();
};


exports.testSchemaValidateMongooseOk = function (test) {
  test.expect(1);
  var extschema = Schemaload.loadExtendedMongooseSchema(modelPath, 'sobj_tables');
  var schema = Schemaload.makeMongooseSchema(extschema);
  Schemaload.validateDocMongoose(mongoose, 'sobj_tables', schema, { 'TransportObject': 'SOBJ', TranslationRelevant: true, _tables: [{ 'Table': 'ABC' }] }).then(
    ok => {
      test.equal(1, 1);
      test.done();
    }).catch(err => {
      console.log(err);
      test.equal(1, 0);
      test.done();
    });
};

exports.testSchemaValidateMongooseBad = function (test) {
  test.expect(2);
  var extschema = Schemaload.loadExtendedMongooseSchema(modelPath, 'sobj_tables');
  var schema = Schemaload.makeMongooseSchema(extschema);
  Schemaload.validateDocMongoose(mongoose, 'sobj_tables', schema, { 'TransportObject': 'SOBJ', TranslationRelevant: 'abc', _tables: [{ 'Table': 'ABC' }] }).then(
    ok => {
      test.equal(1, 0);
      test.done();
    }).catch(err => {
      test.equal( (err + ' ').indexOf('Cast to Boolean failed for value "abc" at path "TranslationRelevant"') , 38 );
      test.equal(1, 1);
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
  test.equal(res, 'abcs');
  test.done();
};

exports.testmakeMongooseCollNameThrows = function (test) {
  test.expect(1);
  try {
    Schemaload.makeMongooseCollectionName('abc');
    test.equaL(1, 0);
  } catch (e) {
    test.equal(1, 1);
  }
  test.done();
};


exports.testCmpTools = function (test) {
  test.expect(1);
  var res =
    Schemaload.cmpTools({ name: 'bb' }, { name: 'aaa' });
  test.equal(res > 0, true);
  test.done();
};




exports.testHasMetaCollectionOK2 = function (test) {
  test.expect(1);
  var fakeMongoose = {
    connection: {
      db: {
        listCollections: function () {
          return {
            toArray: function (fn) {
              setTimeout(fn.bind(undefined, undefined, (['abc', 'metamodels', 'def'])), 0);
            }
          };
        }
      }
    }
  };
  Schemaload.hasMetaCollection(fakeMongoose).then((res) => {
    test.equal(1, 1);
    test.done();
  }).catch(e => {
    test.equal(0, 1);
    test.done();
  });
};





exports.testHasMetaCollectionBad = function (test) {
  test.expect(1);
  var fakeMongoose = {
    connection: {
      db: {
        listCollections: function () {
          return {
            toArray: function (fn) {
              setTimeout(function() {
                fn( undefined, (['abc', 'def']));
              }, 100);
            }
          };
        }
      }
    }
  };
  var p = Schemaload.hasMetaCollection(fakeMongoose);
  p.catch(e => {
    //console.log('in catch');
    test.equal(1, 1);
    //console.log('saying done');
    //test.done();
    return true;
  });
  p.then((res) => {
    test.equal(0, 1);
    test.done();
  }, err => {
    //console.log('got err');
    test.done();
  });
};



exports.testLoadModelNames = function (test) {
  test.expect(1);
  var res = Schemaload.loadModelNames('node_modules/mgnlq_testmodel/testmodel/');
  test.deepEqual(res, ['iupacs',
    'philoelements',
    'cosmos',
    'r3trans',
    'fioriapps',
    'sobj_tables',
    'fioribecatalogs']);
  test.done();
};

exports.testGetModelDocModel = function (test) {


  var mongooseMock = {
    models: {},
    model: function (a, b) {
      if (b) {
        this.models[a] = {
          modelName: a,
          Schema: b
        };
      }
      return this.models[a];
    },
    Schema: mongoose.Schema,
    modelNames: function () {
      return Object.keys(this.models);
    }
  };


  var res = Schemaload.getModelDocModel(mongooseMock);
  test.equal(typeof res, 'object');
  test.deepEqual(mongooseMock.modelNames(), ['metamodels']);
  test.done();
};


exports.testRemoveOthers = function (test) {

  test.done();
};

exports.testUpsertMetaModel = function (test) {
  test.expect(1);
  function makeModel(name, schema) {
    var res = function (doc) {
      this.doc = doc;
    };
    res.prototype.validate = function (cb) {
      if (cb) {
        cb(undefined); // no error
      }
      return Promise.resolve(true);
    };
    res.prototype.save = function () {

    };
    res.modelname = name;
    res.Schema = name;
    res.findOneAndUpdate = function (arg) {
      return Promise.resolve();
    };
    return res;
  }

  var mongooseMock = {
    models: {},
    model: function (a, b) {
      if (b) {
        this.models[a] = makeModel(a, b);
      }
      return this.models[a];
    },
    Schema: mongoose.Schema,
    modelNames: function () {
      return Object.keys(this.models);
    }
  };
  Schemaload.upsertMetaModel(mongooseMock).then(
    function () {
      var res = mongooseMock.modelNames();
      test.deepEqual(res, ['metamodels', 'mongonlq_eschemas']);
      test.done();
    }
  ).catch((err) => {
    console.log('test failed ' + err + '\n' + err.stack);
    test.equal(0, 1);
    test.done();
  });
};






exports.testUpsertModel = function (test) {
  test.expect(1);
  function makeModel(name, schema) {
    debuglog('creating model' + name);
    var res = function (doc) {
      this.doc = doc;
    };
    res.prototype.validate = function (cb) {
      if (cb) {
        cb(undefined); // no error
      }
      return Promise.resolve(true);
    };
    res.prototype.save = function () {
      debuglog('saving something' + this.doc);
    };
    res.modelname = name;
    res.Schema = name;
    res.remove = function () {
      return Promise.resolve(true);
    },
      res.aggregate = function () {
        return Promise.resolve([]);
      },
      res.findOneAndUpdate = function (arg) {
        return Promise.resolve();
      };
    return res;
  }

  var mongooseMock = {
    models: {},
    model: function (a, b) {
      if (b) {
        this.models[a] = makeModel(a, b);
      }
      return this.models[a];
    },
    Schema: mongoose.Schema,
    modelNames: function () {
      return Object.keys(this.models);
    }
  };

  Schemaload.upsertMetaModel(mongooseMock).then(() =>
    Schemaload.upsertModels(mongooseMock, modelPath).then(
      function () {
        var res = mongooseMock.modelNames();
        test.deepEqual(res, ['metamodels', 'mongonlq_eschemas', 'fillers', 'operators']);
        test.done();
      }
    ).catch((err) => {
      console.log('test failed ' + err + '\n' + err.stack);
      test.equal(0, 1);
      test.done();
    })
  );
};


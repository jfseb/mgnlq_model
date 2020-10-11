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
it('testSchemaLoadNames', async () => {
  expect.assertions(1);
  var res = Schemaload.loadModelNames(modelPath);
  expect(res).toEqual(['iupacs',
    'philoelements',
    'cosmos',
    'r3trans',
    'fioriapps',
    'sobj_tables',
    'fioribecatalogs',
    'demomdls']);

  //test.done()

});

// load distinct values from model

process.on('unhandledRejection', function onError(err) {
  console.log(err);
  console.log(err.stack);
  throw err;
});


it('testmapType', async () => {
  expect.assertions(3);
  [
    { input: 'String', expected: String },
    { input: 'Boolean', expected: Boolean },
    { input: 'Number', expected: Number }
  ].forEach(function (fixture) {
    var res = Schemaload.mapType(fixture.input);
    expect(res).toEqual(fixture.expected);
  });

  //test.done()

});

it('testReplaceIfTypeRemoveM', async () => {
  var obj = { _m_abc: 1 };
  Schemaload.replaceIfTypeDeleteM(obj, 1, '_m_abc');
  expect(obj).toEqual({});

  //test.done()

});

it('testmapTypeThrows', async () => {
  expect.assertions(1);
  try {
    Schemaload.mapType('notype');
    expect(1).toEqual(0);
  } catch (e) {
    expect(1).toEqual(1);
  }

  //test.done()

});

/**
 * Unit test for sth
 */
it('testTypeProps', async () => {
  expect.assertions(1);
  var res = Schemaload.typeProps({
    'object_name': {
      'type': 'String',
      'trim': true,
      '_m_category': 'object name',
      'index': true
    }
  });

  expect(res).toEqual({
    'object_name': {
      'type': String,
      'trim': true,
      'index': true
    }
  });

  //test.done()

});

var mongoose = require('mongoose');
//var mongoose = require('mongoose_record_replay').instrumentMongoose(require('mongoose'), 'node_modules/mgnql_testmodel_replay/mgrecrep/',"REPLAY");


it('testSchemaLoad', async () => {
  expect.assertions(2);
  var extschema = Schemaload.loadExtendedMongooseSchema(modelPath, 'sobj_tables');
  var schema = Schemaload.makeMongooseSchema(extschema);
  try {
    Schemaload.validateDoc(mongoose, 'abcx', schema, { 'TransportObject': 'SOBJ', TranslationRelevant: 40 });
    expect(0).toEqual(1);
  } catch (e) {
    expect(1).toEqual(1);
  }
  Schemaload.validateDoc('sobj_tables', schema, { 'TransportObject': 'SOBJ', TranslationRelevant: true, _tables: [{ 'Table': 'ABC' }] });
  expect(1).toEqual(1);

});
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


it('testSchemaValidateOwnDocVsSchemaOk', async () => {
  expect.assertions(1);
  var extschema = Schemaload.loadExtendedMongooseSchema('resources/meta', 'metamodels');
  var doc = FUtils.readFileAsJSON('./resources/meta/metamodels.model.doc.json');
  var schema = Schemaload.makeMongooseSchema(extschema);
  return Schemaload.validateDocMongoose(mongoose, 'meta', schema, doc).then(
    ok => {
      expect(1).toEqual(1);

    }).catch(err => {
    expect(1).toEqual(0);

  });
});

it('testSchemaLoadOwn', async () => {
  expect.assertions(1);
  var extschema = Schemaload.loadExtendedMongooseSchema('resources/meta', 'metamodels');
  var doc = FUtils.readFileAsJSON('./resources/meta/metamodels.model.doc.json');
  var schema = Schemaload.makeMongooseSchema(extschema);
  Schemaload.validateDoc('metamodel', schema, doc);
  expect(1).toEqual(1);

});


it('testSchemaValidateMongooseOk', async () => {
  expect.assertions(1);
  var extschema = Schemaload.loadExtendedMongooseSchema(modelPath, 'sobj_tables');
  var schema = Schemaload.makeMongooseSchema(extschema);
  return Schemaload.validateDocMongoose(mongoose, 'sobj_tables', schema, { 'TransportObject': 'SOBJ', TranslationRelevant: true, _tables: [{ 'Table': 'ABC' }] }).then(
    ok => {
      expect(1).toEqual(1);

    }).catch(err => {
    console.log(err);
    expect(1).toEqual(0);

  });
});

it('testSchemaValidateMongooseBad', async () => {
  expect.assertions(2);
  var extschema = Schemaload.loadExtendedMongooseSchema(modelPath, 'sobj_tables');
  var schema = Schemaload.makeMongooseSchema(extschema);
  return Schemaload.validateDocMongoose(mongoose, 'sobj_tables', schema, { 'TransportObject': 'SOBJ', TranslationRelevant: 'abc', _tables: [{ 'Table': 'ABC' }] }).then(
    ok => {
      expect(1).toEqual(0);

    }).catch(err => {
    expect(
      (err + ' ').indexOf('Cast to Boolean failed for value "abc" at path "TranslationRelevant"')
    ).toEqual(38);
    expect(1).toEqual(1);

  });
});

it('testmakeMongooseCollName', async () => {
  expect.assertions(1);

  try { 
    Schemaload.makeMongoCollectionName('abc');
    expect(0).toEqual(1);
  } catch(e) {
    expect(1).toEqual(1);
  }
  //  expect(res).toEqual('abcs');

});

it('testmakeMongooseCollName2', async () => {
  expect.assertions(1);
  var res = Schemaload.makeMongoCollectionName('abcs');
  expect(res).toEqual('abcs');

});

it('testmakeMongooseCollName', async () => {
  expect.assertions(1);
  var res = Schemaload.makeMongooseModelName('abcs');
  expect(res).toEqual('abcs');

});

it('testmakeMongooseCollNameThrows', async () => {
  expect.assertions(1);
  try {
    Schemaload.makeMongooseCollectionName('abc');
    test.equaL(1, 0);
  } catch (e) {
    expect(1).toEqual(1);
  }

  //test.done()

});


it('testCmpTools', async () => {
  expect.assertions(1);
  var res =
    Schemaload.cmpTools({ name: 'bb' }, { name: 'aaa' });
  expect(res > 0).toEqual(true);

});




it('testHasMetaCollectionOK2', async () => {
  expect.assertions(1);
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
  return Schemaload.hasMetaCollection(fakeMongoose).then((res) => {
    expect(1).toEqual(1);

  }).catch(e => {
    expect(0).toEqual(1);

  });
});


it('testHasMetaCollectionOKBad', async () => {
  expect.assertions(1);
  var fakeMongoose = {
    connection: {
      db: {
        listCollections: function () {
          return {
            toArray: function (fn) {
              setTimeout(function() {
                fn( undefined, (['abc', 'metamodels']));
              }, 100);
            }
          };
        }
      }
    }
  };
  var p = Schemaload.hasMetaCollection(fakeMongoose);
  p.catch(e => {
    expect(0).toEqual(1);
    //console.log('saying done');
    //test.done();
    return true;
  });
  p.then((res) => {
    expect(1).toEqual(1);
  }, err => {
    //test.done()

  });
  await p;
});


it('testHasMetaCollectionBad',  (done) => {
  expect.assertions(1);
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
    expect(1).toEqual(1);
    //console.log('saying done');
    //test.done();
    done();
  });
});





it('testLoadModelNames', async () => {
  expect.assertions(1);
  var res = Schemaload.loadModelNames('node_modules/mgnlq_testmodel/testmodel/');
  expect(res).toEqual(['iupacs',
    'philoelements',
    'cosmos',
    'r3trans',
    'fioriapps',
    'sobj_tables',
    'fioribecatalogs',
    'demomdls']);

  //test.done()

});

it('testGetModelDocModel', async () => {
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
  expect(typeof res).toEqual('object');
  expect(mongooseMock.modelNames()).toEqual(['metamodels']);

  //test.done()

});


it('testRemoveOthers', async () => {
  //test.done()

});

it('testUpsertMetaModel', async () => {
  expect.assertions(1);
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
  return Schemaload.upsertMetaModel(mongooseMock).then(
    function () {
      var res = mongooseMock.modelNames();
      expect(res).toEqual(['metamodels', 'mongonlq_eschemas']);

      //test.done()

    }
  ).catch((err) => {
    console.log('test failed ' + err + '\n' + err.stack);
    expect(0).toEqual(1);

  });
});






it('testUpsertModel', async () => {
  expect.assertions(1);
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
    res.deleteMany = function () {
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

  return Schemaload.upsertMetaModel(mongooseMock).then(() =>
    Schemaload.upsertModels(mongooseMock, modelPath).then(
      function () {
        var res = mongooseMock.modelNames();
        expect(res).toEqual(['metamodels', 'mongonlq_eschemas', 'fillers', 'operators']);

        //test.done()

      }
    ).catch((err) => {
      console.log('test failed ' + err + '\n' + err.stack);
      expect(0).toEqual(1);

    })
  );
});


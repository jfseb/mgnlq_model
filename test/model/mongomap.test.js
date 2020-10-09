/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('mongomap.test');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../js';
//var debuglog = require('debugf')('testdb.mongomap.nunit.js');

var MongoMap = require(root + '/model/mongomap.js');
var Model = require(root + '/model/model.js');
var testmodelPath = 'node_modules/mgnlq_testmodel/testmodel/';

var Schemaload = require(root + '/modelload/schemaload.js');
var MongoUtils  = require(root + '/utils/mongo.js');
var eSchemaSOBJ_Tables = Schemaload.loadExtendedMongooseSchema(testmodelPath, 'sobj_tables');
var eDocSOBJ = Schemaload.loadModelDoc(testmodelPath, 'sobj_tables');

var mgnlq_testmodel_replay = require('mgnlq_testmodel_replay');

var mode = 'REPLAY';
if (process.env[ mgnlq_testmodel_replay.ENV_NAME_MONGO_RECORD_REPLAY ] /*.MGNLQ_TESTMODEL_REPLAY*/ ) {
  mode = 'RECORD';
}

var mongoose = require('mongoose_record_replay').instrumentMongoose(require('mongoose'),
  mgnlq_testmodel_replay.MONGOOSE_RECORD_REPLAY_FOLDER, // VN'node_modules/mgnlq_testmodel_replay/mgrecrep/',
  mode);

// load distinct values from model

process.on('unhandledRejection', function onError(err) {
  console.log(err);
  console.log(err.stack);
  throw err;
});

var connectionStringTestDB = 'mongodb://localhost/testdb';
//  mongoose.connect('mongodb://localhost/nodeunit');


it("testCollectCats", async () => {
  var props = {
    'Object_name_length': {
      'type': 'Number',
      'trim': true,
      '_m_category': 'Object name length'
    }
  };
  var res = MongoMap.collectCategories(props);
  expect(res).toEqual({
    'Object name length' : {
      paths : ['Object_name_length'],
      fullpath : 'Object_name_length'
    }
  });
  //test.done()
});



it("testUnwindsForNonTerminalArrays", async () => {
  var mongoMap = {
    'cat1' :{ paths:  ['cat1']},
    'cat2' : { paths:  ['_mem1', '[]', 'mem3'] }
  };
  var resexpected = [
    { $unwind : { path : '$_mem1',
      'preserveNullAndEmptyArrays' : true }
    }];
  var res = MongoMap.unwindsForNonterminalArrays(mongoMap);
  expect(res).toEqual(resexpected);
  //test.done()
});

it("testUnwindsForNonTerminalArrays2equal", async () => {
  var mongoMap = {
    'cat1' :{ paths:  ['cat1']},
    'cat2' : { paths:  ['_mem1', '[]', 'mem3']},
    'cat3' : { paths:  ['_mem1', '[]', 'mem3']}
  };
  var resexpeted = [
    { $unwind : { path : '$_mem1',
      'preserveNullAndEmptyArrays' : true }
    }];
  var res = MongoMap.unwindsForNonterminalArrays(mongoMap);
  expect(res).toEqual(resexpeted);
  //test.done()
});

it("testUnwindsForNonTerminalArrays2distinct", async () => {
  var mongoMap = {
    'cat1' : { paths: ['cat1']},
    'cat2' : { paths:  ['_mem1', '[]', 'mem3']},
    'cat3' : { paths:  ['_mem2', '_mem3', '[]', 'mem3']}
  };
  var resexpeted = [
    { $unwind : { path : '$_mem1',
      'preserveNullAndEmptyArrays' : true }
    },
    { $unwind : { path : '$_mem2._mem3',
      'preserveNullAndEmptyArrays' : true }
    }
  ];
  var res = MongoMap.unwindsForNonterminalArrays(mongoMap);
  expect(res).toEqual(resexpeted);
  //test.done()
});


it("testUnwindsForNonTerminalArrays3Deep", async () => {
  var mongoMap = {
    'cat1' :  { paths: ['cat1']},
    'cat2' :  { paths: ['_mem1', '[]', 'mem3', '[]', 'mem4']},
    'cat3' :  { paths: ['_mem2', '_mem3', '[]', 'mem3']}
  };
  var resexpeted = [
    { $unwind : { path : '$_mem1',
      'preserveNullAndEmptyArrays' : true }
    },
    { $unwind : { path : '$_mem1.mem3',
      'preserveNullAndEmptyArrays' : true }
    },
    { $unwind : { path : '$_mem2._mem3',
      'preserveNullAndEmptyArrays' : true }
    }
  ];
  var res = MongoMap.unwindsForNonterminalArrays(mongoMap);
  expect(res).toEqual(resexpeted);
  //test.done()
});

it("testGetFirstSegmentThrows", async () => {
  expect.assertions(1);
  try {
    MongoMap.getFirstSegment(['[]','abc']);
    expect(1).toEqual(0);
  } catch(e) {
    expect(1).toEqual(1);
  }
  //test.done()
});

it("testGetFirstSegmentThrowsEmpty", async () => {
  expect.assertions(1);
  try {
    MongoMap.getFirstSegment([]);
    expect(1).toEqual(0);
  } catch(e) {
    expect(1).toEqual(1);
  }

  //test.done()

});


it("testGetFirstSegmentOK", async () => {
  expect.assertions(1);
  expect(MongoMap.getFirstSegment(['abc','def'])).toEqual('abc');

});

it("testUnwindsForNonTerminalArrays3bDeep", async () => {
  var mongoMap = {
    'cat1' : { paths: ['cat1']},
    'cat2' : { paths: ['_mem1', '[]', 'mem3', '[]', 'mem4']},
    'cat4' : { paths : ['_mem1', '[]', 'mem4', '[]', 'memx']},
    'cat3' : { paths: ['_mem2', '_mem3', '[]', 'mem3']}
  };
  var resexpeted = [
    { $unwind : { path : '$_mem1',
      'preserveNullAndEmptyArrays' : true }
    },
    { $unwind : { path : '$_mem1.mem3',
      'preserveNullAndEmptyArrays' : true }
    },
    { $unwind : { path : '$_mem1.mem4',
      'preserveNullAndEmptyArrays' : true }
    },
    { $unwind : { path : '$_mem2._mem3',
      'preserveNullAndEmptyArrays' : true }
    }
  ];
  var res = MongoMap.unwindsForNonterminalArrays(mongoMap);
  expect(res).toEqual(resexpeted);

  //test.done()

});



it("testGetShortProjectedName", async () => {
  var mongoMap = {
    'cat1' : { paths: ['cat1'], fullpath : 'cat1'},
    'ca T2' : { paths: ['_mem1', '[]', 'mem3', '[]', 'mem4'], fullpath : '_mem1.mem3.mem4'},
    'cat4' : { paths : ['_mem1', '[]', 'mem4', '[]', 'memx']},
    'cat3' : { paths: ['_mem2', '_mem3', '[]', 'mem3']}
  };
  var r = MongoMap.getShortProjectedName(mongoMap, 'cat1');
  expect(r).toEqual('cat1');

  var r2 = MongoMap.getShortProjectedName(mongoMap, 'ca T2');
  expect(r2).toEqual('ca_t2');

  //test.done()

});

it("testUnwindsForNonTerminalArraysEmtpy", async () => {
  var mongoMap = {
    'cat1' : { paths: ['cat1'] },
    'cat2' : { paths: ['_mem1', 'mem3', '[]']},
    'cat3' : { paths:   ['_mem2', '_mem3', 'mem3']}
  };
  var resexpeted = [];
  var res = MongoMap.unwindsForNonterminalArrays(mongoMap);
  expect(res).toEqual(resexpeted);

  //test.done()

});

it("testGetMemberByPath", async () => {
  var record = {
    abc : 1,
    def : [ { hij : 2 } ]
  };
  expect(MongoMap.getMemberByPath(record, ['abc'])).toEqual(1);

  //test.done()

});

it("testGetMemberByPathObject", async () => {
  var record = {
    abc : 1,
    def : { hij : 2 }
  };
  expect(MongoMap.getMemberByPath(record, ['def','hij'])).toEqual(2);

  //test.done()

});


it("testGetMemberByPathObjectNoArr", async () => {
  var record = {
    abc : 1,
    def : { hij : 2 }
  };
  expect(MongoMap.getMemberByPath(record, ['def', '[]', 'hij'])).toEqual(2);

  //test.done()

});

it("testGetMemberCategories", async () => {
  var record =  {
    '_categories': {
      'exactmatch': true,
      'category_description': 'For GUI based transaction, the transaction code behind intent, a classical R/3 SAPGUi transaction',
      'category': 'TransactionCode',
      '_id': '59289d809f1ae34670303eb8',
      'category_synonyms': [
        'Transactions',
        'TransactionCode',
        'TransactionCodes'
      ]
    }};
  expect(MongoMap.getMemberByPath( record , ['_categories','[]','category'])).toEqual('TransactionCode');

  //test.done()

});

it("testGetMemberNotPresent", async () => {
  var record = {
    abc : 1,
    def : [ { hij : 2 }, {hij: 3} ]
  };
  expect(MongoMap.getMemberByPath( record , ['nopath','[]','hixx'])).toEqual(undefined);

  //test.done()

});


it("testGetMemberNotPresentDeep", async () => {
  var record = {
    abc : 1,
    def : [ { hij : 2 } ]
  };
  expect(MongoMap.getMemberByPath( record , ['def','[]','hixx'])).toEqual(undefined);

  //test.done()

});


it("testGetMemberByPathThrows", async () => {
  var record = {
    abc : 1,
    def : [ { hij : 2 }, {hij: 3} ]
  };
  try {
    MongoMap.getMemberByPath( record , ['def','[]','hij']);
    expect(1).toEqual(0);
  } catch(e) {
    expect(1).toEqual(1);
  }

  //test.done()

});

it("testGetMemberByPath2", async () => {
  var record = {
    abc : 1,
    def : [ { hij : 2 } ]
  };
  expect(MongoMap.getMemberByPath(record, ['def','[]','hij'])).toEqual(2);

  //test.done()

});

it("testGetMemberByPathTerminalArr", async () => {
  var record = {
    abc : 1,
    def : [ { hij : 2 } ],
    hij : [ 'aa', 'bb']
  };
  expect(MongoMap.getMemberByPath(record, ['hij','[]'])).toEqual(['aa', 'bb']);

  //test.done()

});


it("testCollectCatsArrayOfObject", async () => {
  var props = {
    '_something' : [ {
      'Object_name_length': {
        'type': 'Number',
        'trim': true,
        '_m_category': 'Object name length'
      }}
    ]
  };
  var res = MongoMap.collectCategories(props);
  expect(res).toEqual({
    'Object name length' : {
      paths : ['_something', '[]', 'Object_name_length'],
      fullpath : '_something.Object_name_length'
    }
  });

  //test.done()

});


it("testGetDistintMultivalues", async () => {
  expect.assertions(1);
  return MongoUtils.openMongoose(mongoose, connectionStringTestDB).then( () =>
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
    expect(values).toEqual([  'fiori bom' ,'meta model']);
    MongoUtils.disconnect(mongoose);

    //test.done()

  }
    ).catch((err) => {
    console.log('test failed ' + err + '\n' + err.stack);
    expect(0).toEqual(1);

    //test.done()

  });
});

it("testGetDistintCosmos", async () => {
  expect.assertions(1);
  return MongoUtils.openMongoose(mongoose, connectionStringTestDB).then( () =>
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
    expect(values).toEqual([null, 'Alpha Centauri C', 'Sun', 'n/a']);
    MongoUtils.disconnect(mongoose);

    //test.done()

  }
    ).catch((err) => {
    console.log('test failed ' + err + '\n' + err.stack);
    expect(0).toEqual(1);

    //test.done()

  });
});


it("testGetDistintObjectName", async () => {
  expect.assertions(1);
  return MongoUtils.openMongoose(mongoose, connectionStringTestDB).then( () =>
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
    expect(values).toEqual([ 'Alpha Centauri A',
      'Alpha Centauri B',
      'Alpha Centauri C',
      'Mars',
      'Proxima Centauri b',
      'Sun',
      'earth' ]);
    MongoUtils.disconnect(mongoose);

    //test.done()

  }
    ).catch((err) => {
    console.log('test failed ' + err + '\n' + err.stack);
    expect(0).toEqual(1);

    //test.done()

  });
});

it("testCollectCatsArrayOfPLain", async () => {
  var props = {
    '_something' : [
      {
        'type': 'Number',
        'trim': true,
        '_m_category': 'Object name length'
      }
    ]
  };
  var res = MongoMap.collectCategories(props);
  expect(res).toEqual({
    'Object name length' : {
      paths : ['_something', '[]'],
      fullpath : '_something'
    }
  });

  //test.done()

});

it("testMakeIfMap", async () => {
  var res = MongoMap.makeMongoMap(eDocSOBJ, eSchemaSOBJ_Tables);
  expect(res['TransportObject']).toEqual({ paths: ['TransportObject'], fullpath : 'TransportObject'});
  expect(res['Object name length']).toEqual({ paths: ['Object_name_length'], fullpath : 'Object_name_length'});
  expect(res['Table']).toEqual({ paths: ['_tables', '[]', 'Table'], fullpath : '_tables.Table'});
  expect(1).toEqual(1);

  //test.done()

});

/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('appdata.nunit');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../js';
//var debuglog = require('debugf')('testdb.mongomap.nunit.js');

var MongoMap = require(root + '/model/mongomap.js');
var Model = require(root + '/model/model.js');

//var modelPath = 'node_modules/testmodel/';

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


exports.testCollectCats = function(test) {
  var props = {
    'Object_name_length': {
      'type': 'Number',
      'trim': true,
      '_m_category': 'Object name length'
    }
  };
  var res = MongoMap.collectCategories(props);
  test.deepEqual(res, {
    'Object name length' : {
      paths : ['Object_name_length'],
      fullpath : 'Object_name_length'
    }
  });
  test.done();
};



exports.testUnwindsForNonTerminalArrays = function(test) {
  var mongoMap = {
    'cat1' :{ paths:  ['cat1']},
    'cat2' : { paths:  ['_mem1', '[]', 'mem3'] }
  };
  var resexpected = [
    { $unwind : { path : '$_mem1',
      'preserveNullAndEmptyArrays' : true }
    }];
  var res = MongoMap.unwindsForNonterminalArrays(mongoMap);
  test.deepEqual(res, resexpected, 'correct result');
  test.done();
};

exports.testUnwindsForNonTerminalArrays2equal = function(test) {
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
  test.deepEqual(res, resexpeted, 'correct result');
  test.done();
};

exports.testUnwindsForNonTerminalArrays2distinct = function(test) {
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
  test.deepEqual(res, resexpeted, 'correct result');
  test.done();
};


exports.testUnwindsForNonTerminalArrays3Deep = function(test) {
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
  test.deepEqual(res, resexpeted, 'correct result');
  test.done();
};

exports.testGetFirstSegmentThrows = function(test) {
  test.expect(1);
  try {
    MongoMap.getFirstSegment(['[]','abc']);
    test.equals(1,0);
  } catch(e) {
    test.equals(1,1);
  }
  test.done();
};

exports.testGetFirstSegmentThrowsEmpty = function(test) {
  test.expect(1);
  try {
    MongoMap.getFirstSegment([]);
    test.equals(1,0);
  } catch(e) {
    test.equals(1,1);
  }
  test.done();
};


exports.testGetFirstSegmentOK = function(test) {
  test.expect(1);
  test.equals(MongoMap.getFirstSegment(['abc','def']), 'abc');
  test.done();
};

exports.testUnwindsForNonTerminalArrays3bDeep = function(test) {
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
  test.deepEqual(res, resexpeted, 'correct result');
  test.done();
};



exports.testGetShortProjectedName = function(test) {
  var mongoMap = {
    'cat1' : { paths: ['cat1'], fullpath : 'cat1'},
    'ca T2' : { paths: ['_mem1', '[]', 'mem3', '[]', 'mem4'], fullpath : '_mem1.mem3.mem4'},
    'cat4' : { paths : ['_mem1', '[]', 'mem4', '[]', 'memx']},
    'cat3' : { paths: ['_mem2', '_mem3', '[]', 'mem3']}
  };
  var r = MongoMap.getShortProjectedName(mongoMap, 'cat1');
  test.deepEqual(r,'cat1');

  var r2 = MongoMap.getShortProjectedName(mongoMap, 'ca T2');
  test.deepEqual(r2, 'ca_t2');
  test.done();
};

exports.testUnwindsForNonTerminalArraysEmtpy= function(test) {
  var mongoMap = {
    'cat1' : { paths: ['cat1'] },
    'cat2' : { paths: ['_mem1', 'mem3', '[]']},
    'cat3' : { paths:   ['_mem2', '_mem3', 'mem3']}
  };
  var resexpeted = [];
  var res = MongoMap.unwindsForNonterminalArrays(mongoMap);
  test.deepEqual(res, resexpeted, 'correct result');
  test.done();
};

exports.testGetMemberByPath = function(test) {
  var record = {
    abc : 1,
    def : [ { hij : 2 } ]
  };
  test.equal(MongoMap.getMemberByPath(record, ['abc']) ,1,  'correct value');
  test.done();
};

exports.testGetMemberByPathObject = function(test) {
  var record = {
    abc : 1,
    def : { hij : 2 }
  };
  test.equal(MongoMap.getMemberByPath(record, ['def','hij']) ,2,  'correct value');
  test.done();
};


exports.testGetMemberByPathObjectNoArr = function(test) {
  var record = {
    abc : 1,
    def : { hij : 2 }
  };
  test.equal(MongoMap.getMemberByPath(record, ['def', '[]', 'hij']) ,2,  'correct value');
  test.done();
};

exports.testGetMemberCategories= function(test) {
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
  test.equal(MongoMap.getMemberByPath( record , ['_categories','[]','category']), 'TransactionCode', 'is proper');
  test.done();
};

exports.testGetMemberNotPresent= function(test) {
  var record = {
    abc : 1,
    def : [ { hij : 2 }, {hij: 3} ]
  };
  test.equal(MongoMap.getMemberByPath( record , ['nopath','[]','hixx']), undefined, 'is undefined');
  test.done();
};


exports.testGetMemberNotPresentDeep = function(test) {
  var record = {
    abc : 1,
    def : [ { hij : 2 } ]
  };
  test.equal(MongoMap.getMemberByPath( record , ['def','[]','hixx']), undefined, 'is undefined');
  test.done();
};


exports.testGetMemberByPathThrows = function(test) {
  var record = {
    abc : 1,
    def : [ { hij : 2 }, {hij: 3} ]
  };
  try {
    MongoMap.getMemberByPath( record , ['def','[]','hij']);
    test.equal(1,0);
  } catch(e) {
    test.equal(1,1);
  }
  test.done();
};

exports.testGetMemberByPath2 = function(test) {
  var record = {
    abc : 1,
    def : [ { hij : 2 } ]
  };
  test.equal(MongoMap.getMemberByPath(record, ['def','[]','hij']) , 2,  'correct value');
  test.done();
};

exports.testGetMemberByPathTerminalArr = function(test) {
  var record = {
    abc : 1,
    def : [ { hij : 2 } ],
    hij : [ 'aa', 'bb']
  };
  test.deepEqual(MongoMap.getMemberByPath(record, ['hij','[]']) , ['aa', 'bb'],  'correct value');
  test.done();
};


exports.testCollectCatsArrayOfObject = function(test) {
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
  test.deepEqual(res, {
    'Object name length' : {
      paths : ['_something', '[]', 'Object_name_length'],
      fullpath : '_something.Object_name_length'
    }
  });
  test.done();
};


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
    MongoUtils.disconnect(mongoose);
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
    MongoUtils.disconnect(mongoose);
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
    MongoUtils.disconnect(mongoose);
    test.done();
  }
    ).catch((err) => {
      console.log('test failed ' + err + '\n' + err.stack);
      test.equal(0, 1);
      test.done();
    });
};

exports.testCollectCatsArrayOfPLain = function(test) {
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
  test.deepEqual(res, {
    'Object name length' : {
      paths : ['_something', '[]'],
      fullpath : '_something'
    }
  });
  test.done();
};

exports.testMakeIfMap = function(test) {
  var res = MongoMap.makeMongoMap(eDocSOBJ, eSchemaSOBJ_Tables);
  test.deepEqual(res['TransportObject'],
   { paths: ['TransportObject'], fullpath : 'TransportObject'});
  test.deepEqual(res['Object name length'], { paths: ['Object_name_length'], fullpath : 'Object_name_length'});
  test.deepEqual(res['Table'], { paths: ['_tables', '[]', 'Table'], fullpath : '_tables.Table'});
  test.deepEqual(1,1);
  test.done();
};

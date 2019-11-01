/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('appdata.nunit');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../js';

const mongoosex = require("mongoose");
mongoosex.Promise = global.Promise;

var fs = require('fs');

var debuglog = require('debugf')('test.model.nunit.js');

var Meta = require(root + '/model/meta.js');
//var MongoMap = require(root + '/model/mongomap.js');
var Model = require(root + '/model/model.js');


var IfMatch = require(root + '/match/ifmatch.js');
var EnumRuleType = IfMatch.EnumRuleType;

var testmodel_replay = require('mgnlq_testmodel_replay')

//var modelPath = 'node_modules/testmodel/';
//var testmodelPath = 'node_modules/mgnlq_testmodel/testmodel/';

//var Schemaload = require(root + '/modelload/schemaload.js');
var MongoUtils = require(root + '/utils/mongo.js');


// load distinct values from model

process.on('unhandledRejection', function onError(err) {
  console.log(err);
  console.log(err.stack);
  throw err;
});

/**
 * clear a cache for the defaut mode for coverage
 */
try {
  fs.unlinkSync('./node_modules/mgnlq_testmodel/testmodel/_cache.js.zip');
} catch (e) {
  // empty
}
/**
 * clear a cache for the defaut mode for coverage
 */
try {
  fs.unlinkSync('./node_modules/mgnlq_testmodel_replay/testmodel/_cache.js.zip');
} catch (e) {
  // empty
}



try {
  fs.unlinkSync('./testmodel/_cache.js.zip');
} catch (e) {
  // empty
}

exports.testhasSeenRuleWithFact = function (test) {
  var rules =
    [
      {
        word: 'abc',
        matchedString: 'abc',
        category: 'cata',
        bitindex: 1
      }
    ]
    ;
  var res = Model.hasRuleWithFact(rules, 'abc', 'cata', 1);
  test.equal(res, true);
  res = Model.hasRuleWithFact(rules, 'abc', 'catb', 1);
  test.equal(res, false);
  test.done();
};

var _ = require('lodash');

/*
var mode = 'REPLAY';
if (process.env.MGNLQ_TESTMODEL_REPLAY) {
  mode = 'RECORD';
}*/



var getModel = require('mgnlq_testmodel_replay').getTestModel;

/*

var mongoose = require('mongoose_record_replay').instrumentMongoose(require('mongoose'),
  'node_modules/mgnlq_testmodel_replay/mgrecrep/',
  mode);

var aPromise = undefined;
function getModel() {
  if (mode === 'REPLAY') {
    // in replax mode, using a singleton is sufficient
    aPromise = aPromise || Model.loadModelsOpeningConnection(mongoose, 'mongodb://localhost/testdb');
    return aPromise;
  }
  return Model.loadModelsOpeningConnection(mongoose, 'mongodb://localhost/testdb');
}
*/

//var getModel() = Model.loadModelsOpeningConnection(mongoose,'mongodb://localhost/testdb'  );

var cats = ['AppDocumentationLinkKW',
  'AppKey',
  'AppName',
  'ApplicationComponent',
  'ApplicationType',
  'ArtifactId',
  'BSPApplicationURL',
  'BSPName',
  'BSPPackage',
  'BackendCatalogId',
  'BusinessCatalog',
  'BusinessGroupDescription',
  'BusinessGroupName',
  'BusinessRoleName',
  'ExternalReleaseName',
  'FrontendSoftwareComponent',
  'LPDCustInstance',
  'LUNRIndex',
  'Object name length',
  'PrimaryODataPFCGRole',
  'PrimaryODataServiceName',
  'PrimaryTable',
  'QBE',
  'RoleName',
  'SemanticAction',
  'SemanticObject',
  'Shorttext',
  'SoftwareComponent',
  'Table',
  'TableTransportKeySpec',
  'TechnicalCatalog',
  'TechnicalCatalogSystemAlias',
  'TransactionCode',
  'TranslationRelevant',
  'TransportObject',
  'Type',
  'URLParameters',
  'WebDynproApplication',
  '_url',
  'albedo',
  'appId',
  'atomic weight',
  'besitzer',
  'betriebsende',
  'category',
  'category description',
  'category synonyms',
  'client',
  'clientSpecific',
  'columns',
  'detailsurl',
  'devclass',
  'distance',
  'domain',
  'domain description',
  'eccentricity',
  'element name',
  'element number',
  'element properties',
  'element symbol',
  'exactmatch',
  'fiori intent',
  'gründungsjahr',
  'isPublished',
  'mass',
  'nachfolger',
  'object name',
  'object type',
  'orbit radius',
  'orbital period',
  'orbits',
  'radius',
  'recordKey',
  'releaseId',
  'releaseName',
  'sender',
  'sendertyp',
  'showURI',
  'showURIRank',
  'standort',
  'systemId',
  'tcode',
  'transaction description',
  'uri',
  'uri_rank',
  'visual luminosity',
  'visual magnitude',
  'wordindex'];

/**
 * Unit test for sth
 */
exports.testModel = function (test) {
  test.expect(3);
  getModel().then(
    (amodel) => {
      debuglog('got model');
      var fullModelHandle = amodel.mongoHandle;
      debuglog('here we are' + Object.keys(fullModelHandle));
      var res = amodel.category.sort();
      var delta1 = _.difference(res, cats);
      test.deepEqual(delta1, []);
      var delta2 = _.difference(cats, res);
      test.deepEqual(delta2, [], 'spurious expected');
      test.deepEqual(res, cats, 'correct full categories');
      Model.releaseModel(amodel);
      test.done();
    }
  ).catch((err) => {
    console.log('test failed' + err + '\n' + err.stack);
    test.equal(1, 0);
    test.done();
  }
  );
};


function teardown(test, err) {
  console.log('test failed' + err + '\n' + err.stack);
  test.equal(1, 0);
  test.done();
}


exports.testFilterRemapCategories = function (test) {

  var recs = [{
    a: [{ b: 1, d: 2 }],
    c: 'abc'
  },
  {
    a: [],
    c: 'def'
  },
  {
    a: null,
    c: 'hjl'
  },
  {
    a: undefined,
    c: 'xyz'
  }
  ];

  var mongomap = {
    'catb': { paths: ['a', '[]', 'b'] },
    'catd': { paths: ['a', '[]', 'd'] },
    'catc': { paths: ['c'] }
  };
  var res = Model.filterRemapCategories(mongomap, ['catb', 'catd', 'catc'], recs);
  test.deepEqual(res,
    [
      { 'catb': 1, 'catd': 2, 'catc': 'abc' },
      { 'catb': undefined, 'catd': undefined, 'catc': 'def' },
      { 'catb': undefined, 'catd': undefined, 'catc': 'hjl' },
      { 'catb': undefined, 'catd': undefined, 'catc': 'xyz' }
    ]);
  var res2 = Model.filterRemapCategories(mongomap, ['catd'], recs);
  test.deepEqual(res2,
    [
      { 'catd': 2 },
      { 'catd': undefined },
      { 'catd': undefined },
      { 'catd': undefined }
    ]);
  test.done();
};



exports.testFilterRemapCategoriesBadCat = function (test) {

  var recs = [{
    a: [{ b: 1, d: 2 }],
    c: 'abc'
  },
  {
    a: [],
    c: 'def'
  },
  {
    a: null,
    c: 'hjl'
  },
  {
    a: undefined,
    c: 'xyz'
  }
  ];

  var mongomap = {
    paths: {
      'catb': ['a', '[]', 'b'],
      'catd': ['a', '[]', 'd'],
      'catc': ['c']
    }
  };
  try {
    Model.filterRemapCategories(mongomap, ['NOTPRESENTCAT', 'catb'], recs);
    test.deepEqual(1, 0);
  } catch (e) {
    test.deepEqual(1, 1);
  }
  test.done();
};


/*

  [ '_url',
    'albedo',
    'atomic weight',
    'client',
    'distance',
    'eccentricity',
    'element name',
    'element number',
    'element properties',
    'element symbol',
    'fiori catalog',
    'fiori group',
    'fiori intent',
    'mass',
    'object name',
    'object type',
    'orbit radius',
    'orbital period',
    'orbits',
    'radius',
    'systemId',
    'tool',
    'transaction',
    'unit test',
    'url',
    'visual luminosity',
    'visual magnitude',
    'wiki' ] */

/*

exports.testModelGetOperator = function (test) {
  test.expect(1);
  var op = Model.getOperator(theModel,'containing');
  test.deepEqual(op,
    {
      'arity': 2,
      'operator' : 'containing',
      'argcategory': [
        [
          'category'
        ],
        [
          '_fragment'
        ]
      ]
    }
  , 'no error');
  test.done();
};
*/

exports.testgetAllRecordCategoriesForTargetCategories1 = function (test) {
  getModel().then(theModel => {
    try {

      Model.getDomainCategoryFilterForTargetCategories(theModel, ['element name', 'SemanticObject']);
      test.equal(true, false);
    } catch (e) {
      test.equal(e.toString(), 'Error: categories "element name" and "SemanticObject" have no common domain.');
    }
    test.done();
    Model.releaseModel(theModel);
  }).catch(teardown.bind(undefined, test));
};


exports.testgetAllRecordCategoriesForTargetCategories2 = function (test) {
  getModel().then(theModel => {
    var res = Model.getDomainCategoryFilterForTargetCategories(theModel, ['element name', 'element symbol']);
    test.deepEqual(res, {
      domains: ['IUPAC'],
      categorySet:
      {
        'atomic weight': true,
        'element name': true,
        'element number': true,
        'element symbol': true
      }
    });
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testgetAllRecordCategoriesForTargetCategory = function (test) {
  getModel().then(theModel => {
    var res = Model.getDomainCategoryFilterForTargetCategory(theModel, 'element name');
    test.deepEqual(res, {
      domains: ['IUPAC', 'Philosophers elements'],
      categorySet:
      {
        'atomic weight': true,
        'element name': true,
        'element number': true,
        'element symbol': true,
        'element properties': true
      }
    });
    Model.releaseModel(theModel);
    test.done();
  });
};

exports.testLoadModelsNoMonbooseThrows = function (test) {
  try {
    Model.loadModels();
    test.equal(0, 1);
  } catch (e) {
    test.equal(1, 1);
    test.done();
  }
};


exports.testgetExpandedRecordsForCategory = function (test) {
  getModel().then(theModel => {
    Model.getExpandedRecordsForCategory(theModel, 'Cosmos', 'orbits').then((res) => {
      test.deepEqual(res.length, 7);
      res.sort(Model.sortFlatRecords);
      test.deepEqual(res[0].orbits, 'Alpha Centauri C');
      test.done();
      Model.releaseModel(theModel);
    });
  });
};

exports.testgetExpandedRecordsForCategoryMetamodel = function (test) {
  getModel().then(theModel => {
    Model.getExpandedRecordsForCategory(theModel, 'metamodel', 'category').then((res) => {
      test.deepEqual(res.length, 98);
      res.sort(Model.sortFlatRecords);
      debuglog(() => JSON.stringify(res));
      test.deepEqual(res[0].category, '_url');
      test.deepEqual(res[10].category, 'atomic weight');
      test.done();
      Model.releaseModel(theModel);
    });
  });
};

exports.testgetExpandedRecordsFull = function (test) {
  getModel().then(theModel => {
    Model.getExpandedRecordsFull(theModel, 'Cosmos').then((res) => {
      test.deepEqual(res.length, 7);
      res.sort(Model.sortFlatRecords);
      test.deepEqual(res[0].orbits, 'Sun');
      test.deepEqual(Object.keys(res[0]).length, 98, ' correct number of categories');
      test.done();
      Model.releaseModel(theModel);
    });
  });
};


exports.testgetExpandedRecordsFullArray = function (test) {
  test.expect(6);
  getModel().then(theModel => {
    var modelname = Model.getModelNameForDomain(theModel.mongoHandle, 'metamodel');
    var model = Model.getModelForDomain(theModel, 'metamodel');
    var mongoMap = theModel.mongoHandle.mongoMaps[modelname];
    Model.checkModelMongoMap(model, 'metamodel', mongoMap, 'domain');

    try {
      Model.checkModelMongoMap(undefined, 'metamodel', mongoMap, 'domain');
      test.equal(1, 0);
    } catch (e) {
      test.equal(1, 1);
    }
    try {
      Model.checkModelMongoMap(model, 'metamodel', undefined, 'domain');
      test.equal(1, 0);
    } catch (e) {
      test.equal(1, 1);
    }
    try {
      Model.checkModelMongoMap(model, 'metamodel', mongoMap, 'domainGIBTSNICH');
      test.equal(1, 0);
    } catch (e) {
      test.equal(1, 1);
    }

    Model.getExpandedRecordsFull(theModel, 'metamodel').then((res) => {
      test.deepEqual(res.length, 98);
      res.sort(Model.sortFlatRecords);
      test.deepEqual(res[0].category, '_url');
      test.deepEqual(Object.keys(res[0]).length, 11, ' correct number of models');
      test.done();
      Model.releaseModel(theModel);
    });
  });
};

exports.testgetExpandedRecordsFullArray2 = function (test) {
  getModel().then(theModel => {
    Model.getExpandedRecordsFull(theModel, 'metamodel').then((res) => {
      test.deepEqual(res.length, 98);
      res.sort(Model.sortFlatRecords);
      test.deepEqual(res[0].category, '_url');
      test.deepEqual(Object.keys(res[0]).length, 11, ' correct number of categories');
      test.done();
      Model.releaseModel(theModel);
    });
  });
};

exports.testgetCategoryFilterMultDomains = function (test) {
  getModel().then(theModel => {
    var res = Model.getDomainCategoryFilterForTargetCategories(theModel, ['ApplicationComponent', 'TransactionCode'], true);
    test.deepEqual(res,
      {
        domains: ['Fiori Backend Catalogs', 'FioriBOM'],
        categorySet:
        {
          ApplicationComponent: true,
          BackendCatalogId: true,
          BusinessCatalog: true,
          SemanticAction: true,
          SemanticObject: true,
          SoftwareComponent: true,
          TechnicalCatalogSystemAlias: true,
          TransactionCode: true,
          WebDynproApplication: true,
          devclass: true,
          'fiori intent': true,
          AppDocumentationLinkKW: true,
          AppKey: true,
          AppName: true,
          ApplicationType: true,
          ArtifactId: true,
          BSPApplicationURL: true,
          BSPName: true,
          BSPPackage: true,
          BusinessGroupDescription: true,
          BusinessGroupName: true,
          BusinessRoleName: true,
          ExternalReleaseName: true,
          FrontendSoftwareComponent: true,
          LPDCustInstance: true,
          PrimaryODataPFCGRole: true,
          PrimaryODataServiceName: true,
          RoleName: true,
          TechnicalCatalog: true,
          URLParameters: true,
          appId: true,
          detailsurl: true,
          isPublished: true,
          releaseId: true,
          releaseName: true,
          uri: true,
          uri_rank: true
        }
      });
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testgetCAtegoryFilterOneDomain = function (test) {
  getModel().then(theModel => {
    var res = Model.getDomainCategoryFilterForTargetCategories(theModel, ['ApplicationComponent', 'devclass', 'TransactionCode'], true);
    test.deepEqual(res, {
      domains: ['Fiori Backend Catalogs'],
      categorySet:
      {
        ApplicationComponent: true,
        BackendCatalogId: true,
        BusinessCatalog: true,
        SemanticAction: true,
        SemanticObject: true,
        SoftwareComponent: true,
        TechnicalCatalogSystemAlias: true,
        TransactionCode: true,
        WebDynproApplication: true,
        devclass: true,
        'fiori intent': true
      }
    });
    test.done();
    Model.releaseModel(theModel);
  });
};



exports.testModelGetDomainIndex = function (test) {
  getModel().then(theModel => {
    var res = Model.getDomainBitIndex('IUPAC', theModel);
    test.equal(res, 0x0010, 'IUPAC code ');
    test.done();
    Model.releaseModel(theModel);
  });
};
exports.testModelGetDomainIndexNotPresent = function (test) {
  getModel().then(theModel => {
    var res = Model.getDomainBitIndex('NOTPRESENT', theModel);
    test.equal(res, 0x200, 'abc NOTPRESENT 4096');
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testModelGetDomainIndexThrows = function (test) {
  var a = [];
  for (var i = 0; i < 32; ++i) {
    a.push('xx');
  }
  try {
    Model.getDomainBitIndex('IUPAC', { domains: a });
    test.equal(1, 0);
  } catch (e) {
    test.equal(1, 1);
  }
  test.done();
};


exports.testModelGetDomainIndexSafe = function (test) {
  getModel().then(theModel => {
    var res = Model.getDomainBitIndexSafe('IUPAC', theModel);
    test.equal(res, 0x0010, 'IUPAC code ');
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testModelGetDomainIndexSafeNotPresent = function (test) {
  getModel().then(theModel => {
    try {
      var res = Model.getDomainBitIndexSafe('NOTPRESENT', theModel);
      test.equal(1, 0);
    } catch (e) {
      test.equal(1, 1);
    }
    test.equal(res, undefined, 'abc NOTPRESENT 4096');
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testModelGetDomainIndexSafeThrows2 = function (test) {
  var a = [];
  for (var i = 0; i < 33; ++i) {
    a.push('xx');
  }
  a.push('IUPAC');
  try {
    Model.getDomainBitIndexSafe('IUPAC', { domains: a });
    test.equal(1, 0);
  } catch (e) {
    test.equal(1, 1);
  }
  test.done();
};

exports.testModelGetDomainIndexSafe = function (test) {
  getModel().then(theModel => {
    var res = Model.getDomainBitIndexSafe('IUPAC', theModel);
    test.equal(res, 0x0010, 'IUPAC code ');
    var res2 = Model.getDomainsForBitField(theModel, 0x0004);
    test.equal(res2, 'Fiori Backend Catalogs', 'IUPAC code ');
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testGetModelNameForDomain = function (test) {
  getModel().then(theModel => {
    var u = Model.getModelNameForDomain(theModel.mongoHandle, 'FioriBOM');
    test.deepEqual(u, 'fioriapps');
    var k = Model.getMongooseModelNameForDomain(theModel, 'FioriBOM');
    test.deepEqual(k, 'fioriapps');
    var coll = Model.getMongoCollectionNameForDomain(theModel, 'FioriBOM');
    test.deepEqual(coll, 'fioriapps');
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testGetModelNameForDomainNotPresent = function (test) {
  getModel().then(theModel => {
    try {
      Model.getModelNameForDomain(theModel, 'FioriNIXDA');
      test.equal(1, 0);
    } catch (e) {
      test.equal(1, 1);
    }
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testAddSplitSingleWord = function (test) {
  var seenIt = {};
  var rules = [];

  var newRule = {
    category: 'stars',
    matchedString: 'AlphaCentauriA',
    type: 0,
    word: 'Alpha Centauri A',
    lowercaseword: 'alphacentauria',
    bitindex: 0x32,
    _ranking: 0.95
  };
  Model.addBestSplit(rules, newRule, seenIt);
  test.equals(rules.length, 0);
  test.done();
};

exports.testAddSplitNotCombinable = function (test) {
  var seenIt = {};
  var rules = [];
  var newRule = {
    category: 'stars',
    matchedString: 'AlphaCentauriA',
    type: 0,
    word: 'Peter, Paul and Mary',
    lowercaseword: 'Peter, Paul and Mary',
    bitindex: 0x10,
    _ranking: 0.95
  };
  Model.addBestSplit(rules, newRule, seenIt);
  test.equals(rules.length, 0);
  test.done();
};


exports.testAddSplit = function (test) {

  var seenIt = {};

  var rules = [];

  var newRule = {
    category: 'stars',
    matchedString: 'Alpha Centauri A',
    type: 0,
    word: 'Alpha Centauri A',
    lowercaseword: 'alpha centauri a',
    bitindex: 0x20,
    wordType: 'F',
    bitSentenceAnd: 0x20,
    _ranking: 0.95
  };

  Model.global_AddSplits = true;
  Model.addBestSplit(rules, newRule, seenIt);
  Model.global_AddSplits = false;

  test.deepEqual(rules[0], {
    category: 'stars',
    matchedString: 'Alpha Centauri A',
    bitindex: 32,
    word: 'centauri',
    type: 0,
    lowercaseword: 'centauri',
    bitSentenceAnd: 32,
    wordType: 'F',
    _ranking: 0.95,
    range:
    {
      low: -1,
      high: 1,
      rule: newRule
    }
  }
  );
  test.done();

};

exports.testModelHasDomainIndexinRules = function (test) {
  var a = [];
  for (var i = 0; i < 32; ++i) {
    a.push('xx');
  }
  try {
    Model.getDomainBitIndex('IUPAC', { domains: a });
    test.equal(1, 0);
  } catch (e) {
    test.equal(1, 1);
  }
  test.done();
};


exports.testModelHasDomainIndexInDomains = function (test) {
  getModel().then(theModel => {
    // check that every domain has an index which is distinct
    var all = 0;
    theModel.domains.forEach(function (o) {
      var idx = theModel.full.domain[o].bitindex;
      test.equal(idx !== 0, true);
      //console.log(all);
      all = all | idx;
    });
    test.equal(all, 0x01FF, ' test Inddex in domains 4095');
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testModelHasDomainIndexInAllRules = function (test) {
  getModel().then(theModel => {
    // check that every domain has an index which is distinct
    var all = 0;
    theModel.domains.forEach(function (o) {
      var idx = theModel.full.domain[o].bitindex;
      test.equal(idx !== 0, true);
      //console.log(all);
      all = all | idx;
    });
    test.equal(all, 0x01FF, ' Flags Index In Rules 4095');
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testModelHasNumberRules = function (test) {
  getModel().then(theModel => {
    // check that every domain has an index which is distinct
    var all = 0;
    theModel.domains.forEach(function (o) {
      var idx = theModel.full.domain[o].bitindex;
      test.equal(idx !== 0, true);
      //console.log(all);
      all = all | idx;
    });
    var cnt = 0;
    theModel.mRules.forEach((orule) => {
      if (orule.type === EnumRuleType.REGEXP) {
        var m = orule.regexp.exec('123');
        test.equal(true, !!m);
        test.equal(m[orule.matchIndex], '123');
        ++cnt;
      }
    });
    test.equal(cnt, 1);
    test.equal(all, 0x01FF, ' Flags Index In Rules 4095');
    test.done();
    Model.releaseModel(theModel);
  });
};

const MetaF = Meta.getMetaFactory();


exports.testgetTableColumnsThrows = function (test) {
  try {
    Model.getTableColumns({ domains: [] }, 'adomain');
    test.equal(true, false, 'everything ok');
  } catch (e) {
    test.deepEqual(e.toString().indexOf('Domain "adomain') >= 0, true, ' execption text ');
  }
  test.done();
};

exports.testgetResultAsArrayBad = function (test) {
  try {
    Model.getResultAsArray({}, MetaF.Domain('abc'), MetaF.Domain('def'));
    test.equal(true, false, 'everything ok');
  } catch (e) {
    //console.log(e.toString());
    test.deepEqual(e.toString().indexOf('relation') >= 0, true, '2nd arg not a relation');
  }
  test.done();
};

exports.testgetResultAsArrayNotThere = function (test) {
  var res = Model.getResultAsArray({
    meta: {
      t3: {
        'domain -:- abc': {
          'relation -:- def': { 'category -:- kkk': {} }
        }
      }
    }
  }, MetaF.Domain('abcd'), MetaF.Relation('def'));
  test.deepEqual(res, []);
  test.done();
};


exports.testgetResultAsArrayOk = function (test) {
  var res = Model.getResultAsArray({
    meta: {
      t3: {
        'domain -:- abc': {
          'relation -:- def': { 'category -:- kkk': {} }
        }
      }
    }
  }, MetaF.Domain('abc'), MetaF.Relation('def'));
  test.deepEqual(res[0].toFullString(), 'category -:- kkk', ' correct relation');
  test.done();
};

exports.testgetCategoriesForDomainBadDomain = function (test) {
  test.expect(1);
  getModel().then(theModel => {

    var u = theModel;
    try {
      Model.getCategoriesForDomain(u, 'notpresent');
      test.equal(true, false, 'everything ok');
    } catch (e) {
      test.deepEqual(e.toString().indexOf('notpresent') >= 0, true, 'flawed domain listed');
    }
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testgetDomainsForCategoryBadCategory = function (test) {
  getModel().then(theModel => {

    var u = theModel;
    try {
      Model.getDomainsForCategory(u, 'notpresent');
      test.equal(true, false, 'everything ok');
    } catch (e) {
      test.deepEqual(e.toString().indexOf('notpresent') >= 0, true, 'flawed category listed');
    }
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testgetAllDomainsBintIndex = function (test) {
  getModel().then(theModel => {

    var u = theModel;
    var res = Model.getAllDomainsBitIndex(u);
    test.equal(res, 0x01FF);
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testgetCategoriesForDomain = function (test) {
  test.expect(1);
  getModel().then(theModel => {
    var u = theModel;
    //console.log('here the model ************ ' + JSON.stringify(u.meta.t3,undefined,2));
    var res = Model.getCategoriesForDomain(u, 'Cosmos');
    test.deepEqual(res,
      ['_url',
        'albedo',
        'distance',
        'eccentricity',
        'mass',
        'object name',
        'object type',
        'orbit radius',
        'orbital period',
        'orbits',
        'radius',
        'visual luminosity',
        'visual magnitude'], 'correct categories returned');
    test.done();
    Model.releaseModel(theModel);
  });

};



exports.testgetshowURICategoriesForDomain = function (test) {
  test.expect(1);
  getModel().then(theModel => {
    var u = theModel;
    //console.log('here the model ************ ' + JSON.stringify(u.meta.t3,undefined,2));
    var res = Model.getShowURICategoriesForDomain(u, 'Cosmos');
    test.deepEqual(res,
      ['_url'], 'correct categories returned');
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testgetshowURIRankCategoriesForDomain = function (test) {
  test.expect(1);
  getModel().then(theModel => {
    var u = theModel;
    //console.log('here the model ************ ' + JSON.stringify(u.meta.t3,undefined,2));
    var res = Model.getShowURIRankCategoriesForDomain(u, 'FioriBOM');
    test.deepEqual(res,
      ['uri_rank'], 'correct categories returned');
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testgetDomainsForCategory = function (test) {
  test.expect(1);
  getModel().then(theModel => {
    var u = theModel;
    //console.log('here the model ************ ' + JSON.stringify(u.meta.t3,undefined,2));
    var res = Model.getDomainsForCategory(u, 'element name');
    test.deepEqual(res,
      ['IUPAC', 'Philosophers elements'], 'correct data read');
    test.done();
    Model.releaseModel(theModel);
  });

};



/**
 * Unit test for sth
 */
exports.testModelCheckExactOnly = function (test) {
  test.expect(1);
  getModel().then(theModel => {
    var u = theModel;
    var res = u.mRules.filter(function (oRule) {
      return oRule.exactOnly === true;
    });
    test.equal(res.length, 186 /*431*/, 'correct flag applied');
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testMakeWordMap = function (test) {
  var rules = [
    { type: 0, lowercaseword: 'abc', category: '1', bitindex: 0x1 },
    { type: 1, lowercaseword: 'def', category: '2', bitindex: 0x10 },
    { type: 0, lowercaseword: 'klm', category: '4', bitindex: 0x100 },
    { type: 0, lowercaseword: 'abc', category: '3', bitindex: 0x80 },
  ];
  var res = Model.splitRules(rules);

  test.deepEqual(res,
    {
      allRules: [
        { type: 0, lowercaseword: 'abc', category: '1', bitindex: 0x1 },
        { type: 1, lowercaseword: 'def', category: '2', bitindex: 0x10 },
        { type: 0, lowercaseword: 'klm', category: '4', bitindex: 0x100 },
        { type: 0, lowercaseword: 'abc', category: '3', bitindex: 0x80 },
      ],
      wordMap: {
        'abc': {
          bitindex: 0x81,
          rules: [
            { type: 0, lowercaseword: 'abc', category: '1', bitindex: 0x1 },
            { type: 0, lowercaseword: 'abc', category: '3', bitindex: 0x80 }
          ]
        },
        'klm': {
          bitindex: 0x100,
          rules: [
            { type: 0, lowercaseword: 'klm', category: '4', bitindex: 0x100 }
          ]
        }
      },
      nonWordRules: [{ type: 1, lowercaseword: 'def', category: '2', bitindex: 0x10 }],
      wordCache: {}
    }
  );
  test.done();
};


/**
 * Unit test for sth
 */
exports.testCategorySorting = function (test) {
  var map = {
    'a': { importance: 0.1 }, 'b': { importance: 0.2 },
    'd': { importance: 0.2 }, 'c': { importance: 0.2 }, 'f': {}
  };

  test.equals(Model.rankCategoryByImportance({}, 'uu', 'ff'), 1, 'localcomp');
  test.equals(Model.rankCategoryByImportance({ 'uu': {} }, 'uu', 'ff'), -1, 'onehas');

  test.equals(Model.rankCategoryByImportance({ 'uu': {}, 'ff': { importance: 1 } }, 'uu', 'ff'), 98, '2ndimp');
  test.equals(Model.rankCategoryByImportance({ 'uu': { importance: 0.1 }, 'ff': { importance: 1 } }, 'uu', 'ff'), -0.9, 'firstmoreimp');

  var res = Model.sortCategoriesByImportance(map, ['j', 'e', 'f', 'b', 'c', 'd', 'a', 'b', 'h']);
  test.deepEqual(res, ['a', 'b', 'b', 'c', 'd', 'f', 'e', 'h', 'j']);
  test.done();
};


exports.testWordCategorizationFactCat = function (test) {
  getModel().then(theModel => {
    var earth = theModel.rules.wordMap['earth'];
    //console.log(earth);
    test.deepEqual(earth, {
      bitindex: 65,
      rules:
        [{
          category: 'element name',
          matchedString: 'earth',
          type: 0,
          word: 'earth',
          bitindex: 64,
          bitSentenceAnd: 64,
          exactOnly: false,
          wordType: 'F',
          _ranking: 0.95,
          lowercaseword: 'earth'
        },
        {
          category: 'object name',
          matchedString: 'earth',
          type: 0,
          word: 'earth',
          bitindex: 1,
          bitSentenceAnd: 1,
          exactOnly: false,
          wordType: 'F',
          _ranking: 0.95,
          lowercaseword: 'earth'
        }]
    }
    );
    test.done();
    Model.releaseModel(theModel);
  });

};

exports.testWordCategorizationCategory = function (test) {
  getModel().then(theModel => {
    var ename = theModel.rules.wordMap['element name'];
    //console.log(earth);
    test.deepEqual(ename,
      {
        bitindex: 112,
        rules:
          [{
            category: 'category',
            matchedString: 'element name',
            type: 0,
            word: 'element name',
            lowercaseword: 'element name',
            bitindex: 16,
            wordType: 'C',
            bitSentenceAnd: 16,
            _ranking: 0.95
          },
          {
            category: 'category',
            matchedString: 'element name',
            type: 0,
            word: 'element name',
            lowercaseword: 'element name',
            bitindex: 64,
            wordType: 'C',
            bitSentenceAnd: 64,
            _ranking: 0.95
          },
          {
            category: 'category',
            matchedString: 'element name',
            type: 0,
            word: 'element name',
            bitindex: 32,
            bitSentenceAnd: 32,
            exactOnly: false,
            wordType: 'F',
            _ranking: 0.95,
            lowercaseword: 'element name'
          }]
      }
    );
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testWordCategorizationMetaword_category = function (test) {
  getModel().then(theModel => {
    var earth = theModel.rules.wordMap['category'];
    //console.log(earth);
    test.deepEqual(earth, {
      bitindex: 288,
      rules:
        [{
          category: 'category',
          matchedString: 'category',
          type: 0,
          word: 'category',
          lowercaseword: 'category',
          bitindex: 32,
          wordType: 'C',
          bitSentenceAnd: 32,
          _ranking: 0.95
        },
        {
          category: 'category',
          matchedString: 'category',
          type: 0,
          word: 'category',
          lowercaseword: 'category',
          bitindex: 256,
          wordType: 'C',
          bitSentenceAnd: 256,
          _ranking: 0.95
        },
        {
          category: 'category',
          matchedString: 'category',
          type: 0,
          word: 'category',
          bitindex: 32,
          bitSentenceAnd: 32,
          exactOnly: false,
          wordType: 'F',
          _ranking: 0.95,
          lowercaseword: 'category'
        },
        {
          category: 'category',
          matchedString: 'category synonyms',
          bitindex: 32,
          bitSentenceAnd: 32,
          wordType: 'C',
          word: 'category',
          type: 0,
          lowercaseword: 'category',
          _ranking: 0.95,
          range:
          {
            low: -0,
            high: 1,
            rule:
            {
              category: 'category',
              matchedString: 'category synonyms',
              type: 0,
              word: 'category synonyms',
              lowercaseword: 'category synonyms',
              bitindex: 32,
              wordType: 'C',
              bitSentenceAnd: 32,
              _ranking: 0.95
            }
          }
        },
        {
          category: 'category',
          matchedString: 'category synonyms',
          bitindex: 32,
          bitSentenceAnd: 32,
          wordType: 'F',
          word: 'category',
          type: 0,
          lowercaseword: 'category',
          _ranking: 0.95,
          range:
          {
            low: -0,
            high: 1,
            rule:
            {
              category: 'category',
              matchedString: 'category synonyms',
              type: 0,
              word: 'category synonyms',
              bitindex: 32,
              bitSentenceAnd: 32,
              exactOnly: false,
              wordType: 'F',
              _ranking: 0.95,
              lowercaseword: 'category synonyms'
            }
          }
        }]
    }
    );
    test.done();
    Model.releaseModel(theModel);
  });
};



exports.testWordCategorizationMetaword_Domain = function (test) {
  getModel().then(theModel => {
    var earth = theModel.rules.wordMap['domain'];
    //console.log(earth);
    test.deepEqual(earth,
      {
        bitindex: 544,
        rules:
          [{
            category: 'category',
            matchedString: 'domain',
            type: 0,
            word: 'domain',
            lowercaseword: 'domain',
            bitindex: 32,
            wordType: 'C',
            bitSentenceAnd: 32,
            _ranking: 0.95
          },
          {
            category: 'category',
            matchedString: 'domain',
            type: 0,
            word: 'domain',
            bitindex: 32,
            bitSentenceAnd: 32,
            exactOnly: false,
            wordType: 'F',
            _ranking: 0.95,
            lowercaseword: 'domain'
          },
          {
            category: 'meta',
            matchedString: 'domain',
            type: 0,
            word: 'domain',
            bitindex: 512,
            wordType: 'M',
            bitSentenceAnd: 511,
            _ranking: 0.95,
            lowercaseword: 'domain'
          }]
      }
    );
    test.done();
    Model.releaseModel(theModel);
  });
};



exports.testWordCategorizationDomainSynonyms = function (test) {
  getModel().then(theModel => {
    var fbom = theModel.rules.wordMap['fiori bom'];
    //console.log(earth);
    test.deepEqual(fbom, {
      bitindex: 36,
      rules:
        [{
          category: 'domain',
          matchedString: 'FioriBOM',
          type: 0,
          word: 'fiori bom',
          bitindex: 4,
          bitSentenceAnd: 4,
          wordType: 'D',
          _ranking: 0.95,
          lowercaseword: 'fiori bom'
        },
        {
          category: 'domain',
          matchedString: 'FioriBOM',
          type: 0,
          word: 'fiori bom',
          bitindex: 32,
          bitSentenceAnd: 32,
          wordType: 'F',
          _ranking: 0.95,
          lowercaseword: 'fiori bom'
        }]
    }
    );
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testWordCategorizationCategorySynonyms = function (test) {
  getModel().then(theModel => {
    var fbom = theModel.rules.wordMap['primary odata service'];
    //console.log(earth);
    test.deepEqual(fbom, {
      bitindex: 36,
      rules:
        [{
          category: 'category',
          matchedString: 'PrimaryODataServiceName',
          type: 0,
          word: 'Primary OData Service',
          bitindex: 4,
          bitSentenceAnd: 4,
          wordType: 'C',
          _ranking: 0.95,
          lowercaseword: 'primary odata service'
        },
        {
          category: 'category',
          matchedString: 'PrimaryODataServiceName',
          type: 0,
          word: 'Primary OData Service',
          bitindex: 32,
          bitSentenceAnd: 32,
          wordType: 'F',
          _ranking: 0.95,
          lowercaseword: 'primary odata service'
        }
        ]
    }
    );
    test.done();
    Model.releaseModel(theModel);
  });

};




exports.testWordCategorizationOperator = function (test) {
  getModel().then(theModel => {
    var op = theModel.rules.wordMap['starting with'];
    //console.log(earth);
    test.deepEqual(op, {
      bitindex: 512,
      rules:
        [
          {
            category: 'operator',
            word: 'starting with',
            lowercaseword: 'starting with',
            type: 0,
            matchedString: 'starting with',
            bitindex: 512,
            bitSentenceAnd: 511,
            wordType: 'O',
            _ranking: 0.9
          }
        ]
    });
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testWordCategorizationOperatorMoreThan = function (test) {
  getModel().then(theModel => {
    var op = theModel.rules.wordMap['more than'];
    //console.log(earth);
    test.deepEqual(op, {
      bitindex: 512,
      rules:
        [{
          category: 'operator',
          word: 'more than',
          lowercaseword: 'more than',
          type: 0,
          matchedString: 'more than',
          bitindex: 512,
          bitSentenceAnd: 511,
          wordType: 'O',
          _ranking: 0.9
        }]
    }
    );
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testWordCategorizationOperatorMoreThanOPAlias = function (test) {
  getModel().then(theModel => {
    var op = theModel.rules.wordMap['which has more than'];
    //console.log(earth);
    test.deepEqual(op, {
      bitindex: 512,
      rules:
        [{
          category: 'operator',
          word: 'which has more than',
          lowercaseword: 'which has more than',
          type: 0,
          matchedString: 'more than',
          bitindex: 512,
          bitSentenceAnd: 511,
          wordType: 'O',
          _ranking: 0.9
        }]
    }
    );
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testWordCategorizationOnlyMultiFactNonFirst = function (test) {
  getModel().then(theModel => {
    var op = theModel.rules.wordMap['bremen'];
    //console.log(earth);
    test.deepEqual(op,
      {
        bitindex: 2,
        rules:
          [{
            category: 'standort',
            matchedString: 'Bremen',
            type: 0,
            word: 'Bremen',
            bitindex: 2,
            bitSentenceAnd: 2,
            exactOnly: false,
            wordType: 'F',
            _ranking: 0.95,
            lowercaseword: 'bremen'
          }]
      });
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testWordCategorizationOperatorMultiFact2 = function (test) {
  getModel().then(theModel => {
    var op = theModel.rules.wordMap['münchen'];
    //console.log(earth);
    test.deepEqual(op, {
      bitindex: 2,
      rules:
        [{
          category: 'standort',
          matchedString: 'München',
          type: 0,
          word: 'München',
          bitindex: 2,
          bitSentenceAnd: 2,
          exactOnly: false,
          wordType: 'F',
          _ranking: 0.95,
          lowercaseword: 'münchen'
        }]
    });
    test.done();
    Model.releaseModel(theModel);
  });
};




exports.testWordCategorizationFactCat2 = function (test) {
  getModel().then(theModel => {
    var earth = theModel.rules.wordMap['co-fio'];
    //console.log(earth);
    test.deepEqual(earth,
      {
        bitindex: 4,
        rules:
          [{
            category: 'ApplicationComponent',
            matchedString: 'CO-FIO',
            type: 0,
            word: 'CO-FIO',
            bitindex: 4,
            bitSentenceAnd: 4,
            wordType: 'F',
            _ranking: 0.95,
            exactOnly: true,
            lowercaseword: 'co-fio'
          }]
      }
    );
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testModelTest2 = function (test) {
  test.expect(1);
  getModel().then(theModel => {
    var u = theModel;
    try {
      fs.mkdirSync('logs');
    } catch (e) {
      /* empty */
    }
    fs.writeFileSync('logs/model.mRules.json', JSON.stringify(u.mRules, undefined, 2));
    test.equal(true, true, 'ok');
    test.done();
    Model.releaseModel(theModel);
  });
};


exports.testFindNextLen = function (test) {
  var offsets = [0, 0, 0, 0, 0, 0];
  Model.findNextLen(0, ['a', 'a', 'bb', 'bb', 'ccc', 'ccc', 'dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets, [0, 0, 0, 0, 0, 0], ' target 0');
  Model.findNextLen(1, ['a', 'a', 'bb', 'bb', 'ccc', 'ccc', 'dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets, [0, 0, 0, 0, 0, 2], ' target 1');

  Model.findNextLen(2, ['a', 'a', 'bb', 'bb', 'ccc', 'ccc', 'dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets, [0, 0, 0, 0, 2, 4], ' target 2');
  Model.findNextLen(3, ['a', 'a', 'bb', 'bb', 'ccc', 'ccc', 'dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets, [0, 0, 0, 2, 4, 6], ' target 3');
  Model.findNextLen(4, ['a', 'a', 'bb', 'bb', 'ccc', 'ccc', 'dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets, [0, 0, 2, 4, 6, 8], ' target 4');
  Model.findNextLen(5, ['a', 'a', 'bb', 'bb', 'ccc', 'ccc', 'dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets, [0, 2, 4, 6, 8, 8], ' target 5');
  Model.findNextLen(6, ['a', 'a', 'bb', 'bb', 'ccc', 'ccc', 'dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets, [2, 4, 6, 8, 8, 10], ' target 6');

  test.done();
};




exports.testModelGetColumns = function (test) {
  test.expect(1);
  getModel().then(theModel => {
    var u = theModel;


    // we expect a rule "domain" -> meta
    //console.log(JSON.stringify(u.rawModels));
    var res = Model.getTableColumns(u, 'IUPAC');
    test.deepEqual(res,
      ['element symbol',
        'element number',
        'element name'
      ], 'correct data read');
    test.done();
    Model.releaseModel(theModel);
  });
};

exports.testModelHasDomains = function (test) {

  test.expect(2);
  getModel().then(theModel => {
    var u = theModel;

    // we expect a rule "domain" -> meta

    var r = u.mRules.filter(function (oRule) {
      return oRule.category === 'meta' && oRule.matchedString === 'domain';
    });
    test.equals(r.length, 1, 'domain present');

    var r2 = u.mRules.filter(function (oRule) {
      return oRule.category === 'domain';
    });
    //console.log(JSON.stringify(r2,undefined,2));
    var rx = r2.map(function (oRule) { return oRule.matchedString; });
    // remove duplicates
    rx.sort();
    rx = rx.filter((u, index) => rx[index - 1] !== u);

    test.deepEqual(rx.sort(),
      ['Cosmos',
        'Fiori Backend Catalogs',
        'FioriBOM',
        'IUPAC',
        'Philosophers elements',
        'SAP Transaction Codes',
        'SOBJ Tables',
        'demomdls',
        'metamodel'], 'correct data read');
    test.done();
    Model.releaseModel(theModel);
  });
};


/**
 * Unit test for sth
 */
exports.testModelAppConfigForEveryDomain = function (test) {
  test.expect(1);
  getModel().then(theModel => {
    var u = theModel;
    var res = u.mRules.filter(function (oRule) {
      return oRule.lowercaseword === 'applicationcomponent' && oRule.matchedString === 'ApplicationComponent';
    });
    test.equal(res.length, 3 /*431*/, 'correct number');
    test.done();
    Model.releaseModel(theModel);
  });
};
/*! copyright gerd forstmann, all rights reserved */
// var debug = require('debug')('appdata.nunit')
/* tests which run with a working db instance */




var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../js';

// var Model = require(root + '/model/model.js')
// var Meta = require(root + '/model/meta.js')


var Schemaload = require(root + '/modelload/schemaload.js');
//var FUtils = require(root + '/model/model.js');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/nodeunit');

var db = mongoose.connection;

var mgopen = new Promise(function(resolve, reject) {
  db.on('error', (err) => {
    console.error(err);
    reject(err);}
  );
  db.once('open', function () {
    // we're connected!
    console.log('here model names : ' + db.modelNames());
    console.log('now model names : ' + db.modelNames());
    console.log('done');
    resolve(db);
  });
});

var modelPath = 'node_modules/mgnlq_testmodel/testmodel/';
/**
 * Unit test for sth
 */
exports.testSchemaLoad = function (test) {
  test.expect(1);
  var res = Schemaload.loadModelNames(modelPath);
  test.deepEqual(res, [ 'iupac',
    'philoelements',
    'cosmos',
    'r3trans',
    'bom',
    'SOBJ_Tables',
    'FioriBECatalogs' ]);
  test.done();
};

process.on('unhandledRejection', function onError(err) {
  console.log(err);
  console.log(err.stack);
  throw err;
});


exports.testInsertModel = function (test) {
  test.expect(1);
  mgopen.then( function()  {


    Schemaload.upsertMetaModel(mongoose).then(
      function() {
     //   console.log('conn '+ Object.keys(mongoose.connection).join('\n'));
     //   console.log('conn.collections:\n' + Object.keys(mongoose.connection.collections).join('\n'));
     //   console.log('db ='+ Object.keys(mongoose.connection.db).join('\n'));
        mongoose.model('mongonlq_eschema').count({},function(err, a) {
          console.log('counting '+ err + ' ' +  a);
        });
        mongoose.connection.db.collection('userCollection').insert({
          username: 'user1',
          firstName: 'Steve',
          lastName: 'LastName',
        });
        console.log ( ' get  a schema ' + Schemaload.MongoNLQ.COLL_EXTENDEDSCHEMAS);
        mongoose.model('mongonlq_eschema').find({}).then((a2,a4) => {
           console.log('a1m' + JSON.stringify(a2));
        });
        mongoose.connection.db.collection('mongonlq_eschemas').find({}).toArray().then( (a1,a2) =>
        {
             console.log('a1' + JSON.stringify(a1));

        });
        var r = mongoose.connection.db.collection('mongonlq_eschemas').find({}, function(err, res) {
          console.log(`here res `+ res.toArray().then( (erra,ra)=>
          {
            console.log('toarray ' + ra);
            console.log('toarray err' + JSON.stringify(erra));

          }));
          console.log(' here err' + err);
          //JSON.stringify(res) + JSON.stringify(err));
          test.done();

        });
        console.log(' here result : ' + r);
    /*    console.log('what is this ' + mongoose.connection.db.collection('mongonlq_eschemas').find({}).toArray( (e,s) =>
        {
          console.log('here arr' + s);
          return s;
          }
        ));
         var r =  mongoose.connection.db.collection('Schemaload.MongoNLQ.COLL_EXTENDEDSCHEMAS').find({
       //   modelname : Schemaload.MongoNLQ.MODELNAME_META
          }).toArray();
          */
       // console.log(`here our r` + JSON.stringify(r));

      }
    ).catch( (err) => {
      console.log('test failed ' + err + '\n' + err.stack);
      test.equal(0,1);
      test.done();
    });
  });
};


exports.testInsertModel({ expect : function() {}, done : function() {}});
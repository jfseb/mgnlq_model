# mgnlq_model  [![Build Status](https://travis-ci.org/jfseb/mgnlq_model.svg?branch=master)](https://travis-ci.org/jfseb/mgnlq_model)[![Coverage Status](https://coveralls.io/repos/github/jfseb/mgnlq_model/badge.svg)](https://coveralls.io/github/jfseb/mgnlq_model)


model load and processing code

this will be slowly migrated to anychronous processing, separating the
processes:

  1. metamodel building
  2. model index building for processing access
  3. rule index building
  4. data loading and validation



for a nested document

 {$match:{"bar.text":"Hi"}},
  {$unwind:"$bar"},
  {$match:{"bar.text":"Hi"}},
  {$group:{"_id":"$_id","bars":{$push:"$bar"}}}



Database used for testing containing data

(set up via node js/makedb.js or npm load_data )
  mongodb://localhost/testdb'




# Createing a database

via
```
node js/makedb.js
```
or npm load_data

a mongo db instance is created,
The name of the DB and the source data is controlled via the environment parameters:

var mongoConnectionString = process.env.MONGO_DBURL || 'mongodb://localhost/testdb';
var modelPath = process.env.MGNLQ_MODELPATH  || 'node_modules/mgnlq_testmodel/testmodel/';

# recording the test queries

SET MONGO_TEST_RECORD=RECORD

run the tests -> data is created in node_modules/mgnql_testmodel_replay/mgrecrep/data

(typcially linked with
`npm link mgnlq_testmodel_replay` )
This data must be checked in, the package version increased and published,
subsequently the dependency has to be updated to allow running unit tests on travis etc.



# Testing

The unit test use
[mongoose_record_replay](https://www.npmjs.com/package/mongoose_record_replay)  and data in
(npm module) [mgnlq_testmodel_replay](https://www.npmjs.com/package/mgnlq_testmodel_replay)
to be run without a mongoose instance.

Alternatively, by setting MONGO_TEST_RECORD='RECORD'
Unit tests can be run against a mongodb installed on

```'mongodb://localhost/testdb';```



```javascript
var mode = 'REPLAY';
if (process.env.MONGO_TEST_RECORD) {
  mode = 'RECORD';
}
var mongoose = require('mongoose_record_replay').instrumentMongoose(require('mongoose'),
  'node_modules/mgnlq_testmodel_replay/mgrecrep/',
  mode);
```

This DB must be filled with data, see
```bash
  nmp run load_data
```
to create the db from files


# Cache file control

Model data is written and read from a cache file
in modelPath unless
```MQNLQ_MODEL_NO_FILECACHE```
is set to true

# TODO

- Analyze model for mismatches in category aliases

```
 e.g.   DomainA   element name  synonyms: [  "element names", "elementname"]
        DomainB   element name  synonyms:[ "elements" ]
```
When this occurs a mismatch "elements" will match only DomainB,


- Analyze model for casing mismatches, e.g.

abc => Abc
abc => abc


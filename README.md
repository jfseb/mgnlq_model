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
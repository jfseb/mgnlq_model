var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../js';
//var debuglog = require('debug')('rule.nunit');

const Rule = require(root + '/match/rule.js');


exports.testcompareMRuleFull1 = function (test) {
  const res = Rule.compareMRuleFull({
    category : 'AAA',
  },{category : 'BBB'});
  test.deepEqual(res < 0, true, 'compare cat ok ');
  test.done();
};




exports.testcompareMRuleFull2= function (test) {
  const res = Rule.compareMRuleFull({
    category : 'AAA',
    matchedString : 'AAA'
  },{
    category : 'AAA',
    matchedString : 'BBB'});
  test.deepEqual(res < 0, true, 'compare cat ok ');
  test.done();
};


exports.testcompareMRuleFullType= function (test) {
  const res = Rule.compareMRuleFull({
    category : 'AAA',
    type : 1,
    matchedString : 'AAA'
  },{
    category : 'AAA',
    type : 2,
    matchedString : 'BBB'});
  test.deepEqual(res < 0, true, 'compare cat ok ');
  test.done();
};




exports.testcompareMRuleFullWordType= function (test) {
  const res = Rule.compareMRuleFull({
    category : 'AAA',
    type : 1,
    matchedString : 'AAA',
    word : 'AAA'
  },{
    category : 'AAA',
    type : 1,
    matchedString : 'AAA',
    word : 'BBB'});
  test.deepEqual(res < 0, true, 'compare FullWordType ok ');
  test.done();
};




exports.testcompareMRuleFullRaking = function (test) {
  const res = Rule.compareMRuleFull({
    category : 'AAA',
    type : 1,
    _ranking : 0.8,
    matchedString : 'AAA',
    word : 'AAA'
  },{
    category : 'AAA',
    type : 1,
    _ranking : 0.9,
    matchedString : 'AAA',
    word : 'AAA'});
  test.deepEqual(res < 0, true, 'compare FullWordType ok ');
  test.done();
};


exports.testcompareMRuleFullExactOnly = function (test) {
  const res = Rule.compareMRuleFull({
    category : 'AAA',
    type : 1,
    _ranking : 0.7,
    matchedString : 'AAA',
    exactOnly:false,
    word : 'AAA'
  },{
    category : 'AAA',
    type : 1,
    _ranking : 0.7,
    matchedString : 'AAA',
    exactOnly : true,
    word : 'AAA'});
  test.deepEqual(res > 0, true, 'compare FullWordType ok ');
  test.done();
};


exports.testcompareMRuleFullExactOnlyOne = function (test) {
  const res = Rule.compareMRuleFull({
    category : 'AAA',
    type : 1,
    _ranking : 0.7,
    matchedString : 'AAA',
    exactOnly: true,
    word : 'AAA'
  },{
    category : 'AAA',
    type : 1,
    _ranking : 0.7,
    matchedString : 'AAA',
    exactOnly : false,
    word : 'AAA'});
  test.deepEqual(res < 0, true, 'compare FullWordType ok ');
  test.done();
};

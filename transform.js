var util = require('util');

/**
 * A transform for nodeunit.js to  jest transformations. 
 * 
 * npm i -g jscodeshift
 * 
 * (dry)
 * 
 * jscodeshift   test\myfile\my.junit.js  --print -d  
 * 
 * replace in situ w.o. the -d 
 */


function transformEqual(src, api) {
  const j = api.jscodeshift;
  return api.jscodeshift(src)
    .find(j.ExpressionStatement, {
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: {
            type: "Identifier",
            name: "test"
          },
          property: (node) => {
            console.log(' Node is ' + node.name);
            return node.type === 'Identifier' && (node.name == 'deepEqual' || node.name == 'equals' || node.name == 'equal');
          },
        },
      },
    }).replaceWith(
      p => {
        console.log("this is p " + util.inspect(p));
        var cAllExpression = p.value.expression;
        console.log("this is args " + util.inspect(cAllExpression));
        var exp = j.callExpression(j.identifier('expect'),
          [cAllExpression.arguments[0]]);

        return j.expressionStatement(j.callExpression(
          j.memberExpression(exp, j.identifier('toEqual')),
          [cAllExpression.arguments[1]])
        );
      }
    ).toSource();
}


function transformTestExpect(src, api) {
  const j = api.jscodeshift;
  return api.jscodeshift(src)
    .find(j.ExpressionStatement, {
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: {
            type: "Identifier",
            name: "test"
          },
          property: (node) => {
            return node.type === 'Identifier' && node.name == 'expect';
          },
        },
      },
    }).replaceWith(
      p => {
        console.log("this is p " + util.inspect(p));
        var cAllExpression = p.value.expression;
        console.log("this is args " + util.inspect(cAllExpression));
       // var exp = j.callExpression(j.identifier('expect'),
       //   [cAllExpression.arguments[0]]);

        return j.expressionStatement(j.callExpression(
          j.memberExpression( j.identifier('expect'), j.identifier('assertions')),
          [cAllExpression.arguments[0]])
        );
      }
    ).toSource();
}

function transformDone(src, api) {
  const j = api.jscodeshift;
  return api.jscodeshift(src)
    .find(j.ExpressionStatement, {
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: {
            type: "Identifier",
            name: "test"
          },
          property: (node) => {
            console.log(' Node is ' + node.name);
            return node.type === 'Identifier' && (node.name == 'done');
          },
        },
      },
    }).replaceWith(
      p => {
        var es = j.emptyStatement();
        es.comments = [j.commentLine('test.done()')];
        return es;
      }
    ).toSource();
}

module.exports = function (fileInfo, api, options) {
  const j = api.jscodeshift;
  var s1 = transformEqual(fileInfo.source,api); 
  var s2 =  transformDone(s1, api);
  var s3 = transformTestExpect(s2, api);
  return api.jscodeshift(s3)

    .find(j.AssignmentExpression, {
      operator: "=",
      type: (a) => { console.log(' looking at ' + a); return true; },
      left: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "exports" }
      },
      right: { type: 'FunctionExpression' }
    })
    .replaceWith(p => {
      console.log('found sth ' + util.inspect(p));
      var body = p.value.right.body;
      var epName = p.value.left.property.name;
      var af = j.arrowFunctionExpression([], body); af.async = true;
      return j.callExpression(j.identifier('it'), [j.literal(epName), af]);
    }).




    toSource();




  //   .find(j.callExpression)FunctionExpre
  //   .findVariableDeclarators('root')
  //   .renameTo('roOt')
  //   .toSource();
};

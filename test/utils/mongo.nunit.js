/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('appdata.nunit');

var Mongo = require('../../js/utils/mongo.js');


//var connectionStringTestDB = 'mongodb://localhost/testdb';
//  mongoose.connect('mongodb://localhost/nodeunit');


exports.testOpen = function (test) {
  test.expect(7);
  var fakeMongoose = {
    connect: function (str) {
      test.equal(str, 'mongodb://localhost/nodeunit');
    },
    connection: {
      on: function (a, arg) {
        test.equal(a, 'error');
      },
      once: function (a, arg) {
        if (a === 'open') {
          test.equal(typeof arg, 'function');
          setTimeout(arg, 0);
        } else if (a === 'error') {
          test.equal(typeof arg, 'function');
        } else {
          test.equal(1, 0, 'called with sth else');
        }
      }
    }
  };

  fakeMongoose.connection.once.setMaxListeners = function () {
    test.equal(arguments[0],0);
    test.equal(arguments.length, 1, 'setMaxListeners called ' + JSON.stringify(arguments));
  };
  fakeMongoose.connection.on.setMaxListeners = function () {
    test.equal(arguments[0], 0);
    test.equal(arguments.length, 1);
  };

  Mongo.openMongoose(fakeMongoose, undefined).then(res => {
    test.done();
  }
  );
};


exports.testDisconnectReset = function (test) {
  test.expect(2);
  var fakeMongoose = {
    connection: {
      modelNames: function () {
        return ['abc'];
      },
      models: { 'abc': 1 },
      readyState: 1
    },
    disconnect: function () {
      test.equal(arguments.length, 0);
    }
  };
  Mongo.disconnectReset(fakeMongoose);
  test.equal(Object.keys(fakeMongoose.connection.models).length, 0);
  test.done();
};



exports.testGetCollectionNames = function (test) {
  test.expect(1);
  var fakeMongoose = {
    connection: {
      db: {
        collections : function() {
          return Promise.resolve([ { collectionName : 'abc'}, { collectionName : 'def'}]);
        }
      }
    },
  };
  Mongo.getCollectionNames(fakeMongoose).then( cols => {
    test.deepEqual(cols, ['abc', 'def']);
    test.done();
  });
};


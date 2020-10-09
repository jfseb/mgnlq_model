/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('appdata.nunit');

var Mongo = require('../../js/utils/mongo.js');


//var connectionStringTestDB = 'mongodb://localhost/testdb';
//  mongoose.connect('mongodb://localhost/nodeunit');


it('testOpen', async () => {
  expect.assertions(7);
  var fakeMongoose = {
    connect: function (str) {
      expect(str).toEqual('mongodb://localhost/nodeunit');
    },
    connection: {
      on: function (a, arg) {
        expect(a).toEqual('error');
      },
      once: function (a, arg) {
        if (a === 'open') {
          expect(typeof arg).toEqual('function');
          setTimeout(arg, 0);
        } else if (a === 'error') {
          expect(typeof arg).toEqual('function');
        } else {
          expect(1).toEqual(0);
        }
      }
    }
  };

  fakeMongoose.connection.once.setMaxListeners = function () {
    expect(arguments[0]).toEqual(0);
    expect(arguments.length).toEqual(1);
  };
  fakeMongoose.connection.on.setMaxListeners = function () {
    expect(arguments[0]).toEqual(0);
    expect(arguments.length).toEqual(1);
  };

  Mongo.openMongoose(fakeMongoose, undefined).then(res => {
    //test.done()

  }
  );
});


it('testDisconnectReset', async () => {
  expect.assertions(2);
  var fakeMongoose = {
    connection: {
      modelNames: function () {
        return ['abc'];
      },
      models: { 'abc': 1 },
      readyState: 1
    },
    disconnect: function () {
      expect(arguments.length).toEqual(0);
    }
  };
  Mongo.disconnectReset(fakeMongoose);
  expect(Object.keys(fakeMongoose.connection.models).length).toEqual(0);

});



it('testGetCollectionNames', async () => {
  expect.assertions(1);
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
    expect(cols).toEqual(['abc', 'def']);

    //test.done()

  });
});


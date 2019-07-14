import { Meteor } from 'meteor/meteor';

Tinytest.add(
  'Kadira Send - Kadira._getSendFunction',
  function (test) {
    const func = Kadira._getSendFunction();
    if (Meteor.isServer) {
      test.equal(func, Kadira._serverSend);
    } else {
      test.equal(func, Kadira._clientSend);
    }
  }
);

Tinytest.addAsync(
  'Kadira Send - send data',
  function (test, done) {
    const endPoint = 'http://localhost:8808/echo';
    const payload = { aa: 10 };
    const func = Kadira._getSendFunction();
    func(endPoint, payload, (err, res) => {
      test.equal(err, null);
      test.equal(res, { echo: payload });
      done();
    });
  }
);

Tinytest.addAsync(
  'Kadira Send - Kadira.send with path',
  function (test, done) {
    const payload = { aa: 10 };
    const newKadiraOptions = { endpoint: 'http://localhost:8808' };
    withKadiraOptions(newKadiraOptions, function () {
      Kadira.send(payload, '/echo', function (err, data) {
        test.equal(err, null);
        test.equal(data, { echo: payload });
        done();
      });
    });
  }
);

Tinytest.addAsync(
  'Kadira Send - Kadira.send with path (but no begining slash)',
  function (test, done) {
    const payload = { aa: 10 };
    const newKadiraOptions = { endpoint: 'http://localhost:8808' };
    withKadiraOptions(newKadiraOptions, function () {
      Kadira.send(payload, 'echo', function (err, data) {
        test.equal(err, null);
        test.equal(data, { echo: payload });
        done();
      });
    });
  }
);

if (Meteor.isServer) {
  Tinytest.addAsync(
    'Kadira Send - Kadira.send - accepting server errors',
    function (test, done) {
      const payload = { aa: 10 };
      const newKadiraOptions = { endpoint: 'http://localhost:8808' };
      withKadiraOptions(newKadiraOptions, function () {
        Kadira.send(payload, 'non-exisiting-route', function (err) {
          test.equal(err.reason, 'internal-error-here');
          test.equal(err.error, 400);
          done();
        });
      });
    }
  );
}

function withKadiraOptions(options, f) {
  const orginalOptions = Kadira.options;
  Kadira.options = options;
  f();
  Kadira.options = orginalOptions;
}

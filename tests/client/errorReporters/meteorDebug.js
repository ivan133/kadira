
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

Tinytest.add(
  'Client Side - Error Manager - Reporters - meteor._debug - with zone',
  testWithErrorTracking(function (test) {
    hijackKadiraSendErrors(mock_KadiraSendErrors);
    test.equal(typeof Meteor._debug, 'function');
    let errorSent = false;
    const message = Random.id();

    // set window.zone as nothing
    const originalZone = window.zone;
    window.zone = {};

    Meteor._debug(message, '_stack');
    test.equal(errorSent, false);
    restoreKadiraSendErrors();

    window.zone = originalZone;
    function mock_KadiraSendErrors() {
      errorSent = true;
    }
  })
);

Tinytest.add(
  'Client Side - Error Manager - Reporters - meteor._debug - without zone',
  testWithErrorTracking(function (test) {
    hijackKadiraSendErrors(mock_KadiraSendErrors);
    test.equal(typeof Meteor._debug, 'function');
    let errorSent = false;
    const originalZone = window.zone;
    const message = Random.id();
    window.zone = undefined;

    try {
      Meteor._debug(message, '_stack');
      // eslint-disable-next-line no-empty
    } catch (e) { }

    window.zone = originalZone;
    test.equal(errorSent, true);
    restoreKadiraSendErrors();

    function mock_KadiraSendErrors(error) {
      errorSent = true;
      test.equal('string', typeof error.appId);
      test.equal('object', typeof error.info);
      test.equal(message, error.name);
      test.equal('client', error.type);
      test.equal(true, Array.isArray(JSON.parse(error.stacks)));
      test.equal('number', typeof error.startTime);
      test.equal('meteor._debug', error.subType);
    }
  })
);

Tinytest.add(
  'Client Side - Error Manager - Reporters - meteor._debug - using Error only',
  testWithErrorTracking(function (test) {
    hijackKadiraSendErrors(mock_KadiraSendErrors);
    test.equal(typeof Meteor._debug, 'function');
    let errorSent = false;
    const originalZone = window.zone;
    const message = Random.id();
    window.zone = undefined;

    try {
      const err = new Error(message);
      err.stack = '_stack';
      Meteor._debug(err);
      // eslint-disable-next-line no-empty
    } catch (e) { }

    window.zone = originalZone;
    test.equal(errorSent, true);
    restoreKadiraSendErrors();

    function mock_KadiraSendErrors(error) {
      errorSent = true;
      test.equal('string', typeof error.appId);
      test.equal('object', typeof error.info);
      test.equal(message, error.name);
      test.equal('client', error.type);
      test.equal(true, Array.isArray(JSON.parse(error.stacks)));
      test.equal('number', typeof error.startTime);
      test.equal('meteor._debug', error.subType);
    }
  })
);

//--------------------------------------------------------------------------\\

let original_KadiraSendErrors;

function hijackKadiraSendErrors(mock) {
  original_KadiraSendErrors = Kadira.errors.sendError;
  Kadira.errors.sendError = mock;
}

function restoreKadiraSendErrors() {
  Kadira.errors.sendError = original_KadiraSendErrors;
}

function testWithErrorTracking(testFunction) {
  return function (test) {
    const status = Kadira.options.enableErrorTracking;
    const appId = Kadira.options.appId;
    Kadira.options.appId = 'app';
    Kadira.enableErrorTracking();
    testFunction(test);
    Kadira.options.appId = appId;
    status ? Kadira.enableErrorTracking() : Kadira.disableErrorTracking();
  };
}

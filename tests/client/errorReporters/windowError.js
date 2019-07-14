import { init as initOnError } from '../../../lib/client/errorReporters/windowError';

Tinytest.addAsync(
  'Client Side - Error Manager - Reporters - window.onerror - with all args',
  testWithErrorTrackingAsync(function (test, next) {
    const originalOnError = window.onerror;
    initOnError();
    hijackKadiraSendErrors(mock_KadiraSendErrors);
    test.equal(typeof window.onerror, 'function');
    const message = 'testMessage';
    window.onerror(message, '_url', 1, 1, new Error('test-error'));

    function mock_KadiraSendErrors(error) {
      test.equal(typeof error.appId, 'string');
      test.equal(typeof error.info, 'object');
      test.equal(error.name, message);
      test.equal(error.type, 'client');
      test.isTrue(Array.isArray(JSON.parse(error.stacks)));
      test.equal(typeof error.startTime, 'number');
      test.equal(error.subType, 'window.onerror');
      restoreKadiraSendErrors();
      window.onerror = originalOnError;
      next();
    }
  })
);

Tinytest.addAsync(
  'Client Side - Error Manager - Reporters - window.onerror - without error',
  testWithErrorTrackingAsync(function (test, next) {
    const originalOnError = window.onerror;
    initOnError();
    hijackKadiraSendErrors(mock_KadiraSendErrors);
    test.equal(typeof window.onerror, 'function');
    const message = 'testMessage';
    window.onerror(message, '_url', 1, 1);

    function mock_KadiraSendErrors(error) {
      test.equal('string', typeof error.appId);
      test.equal('object', typeof error.info);
      test.equal(message, error.name);
      test.equal('client', error.type);
      test.equal(true, Array.isArray(JSON.parse(error.stacks)));
      test.equal('number', typeof error.startTime);
      test.equal('window.onerror', error.subType);
      restoreKadiraSendErrors();
      window.onerror = originalOnError;
      next();
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

function testWithErrorTrackingAsync(testFunction) {
  return function (test, next) {
    const status = Kadira.options.enableErrorTracking;
    const appId = Kadira.options.appId;
    Kadira.options.appId = 'app';
    Kadira.enableErrorTracking();
    testFunction(test, function () {
      Kadira.options.appId = appId;
      status ? Kadira.enableErrorTracking() : Kadira.disableErrorTracking();
      next();
    });
  };
}

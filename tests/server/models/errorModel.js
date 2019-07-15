import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { ErrorModel } from '../../../lib/server/models/errorModel';

Tinytest.add(
  'Models - Errors - empty',
  function (test) {
    const model = new ErrorModel('_appId');
    const metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 0);
  }
);

Tinytest.add(
  'Models - Errors - add errors to model',
  function (test) {
    const model = new ErrorModel('_appId');
    const error = { name: '_name', message: '_message', stack: '_stack' };
    const trace = { type: '_type', subType: '_subType', name: '_name' };
    model.trackError(error, trace);
    const storedMetric = model.errors['_type:_message'];
    const expected = {
      appId: '_appId',
      name: '_message',
      subType: '_subType',
      type: '_type',
      trace,
      stacks: [{ stack: '_stack' }],
      count: 1,
    };
    test.equal(typeof storedMetric.startTime, 'number');
    delete storedMetric.startTime;
    test.equal(storedMetric, expected);
  }
);

Tinytest.add(
  'Models - Errors - add errors to model (trace without subType)',
  function (test) {
    const model = new ErrorModel('_appId');
    const error = { name: '_name', message: '_message', stack: '_stack' };
    const trace = { type: '_type', name: '_name' };
    model.trackError(error, trace);
    const storedMetric = model.errors['_type:_message'];
    const expected = {
      appId: '_appId',
      name: '_message',
      subType: '_name',
      type: '_type',
      trace,
      stacks: [{ stack: '_stack' }],
      count: 1,
    };
    test.equal(typeof storedMetric.startTime, 'number');
    delete storedMetric.startTime;
    test.equal(storedMetric, expected);
  }
);

Tinytest.add(
  'Models - Errors - buildPayload',
  function (test) {
    const model = new ErrorModel('_appId');
    const error = { name: '_name', message: '_message', stack: '_stack' };
    const trace = { type: '_type', subType: '_subType', name: '_name' };
    model.trackError(error, trace);
    const metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 1);
    const payload = metrics[0];
    const expected = {
      appId: '_appId',
      name: '_message',
      subType: '_subType',
      type: '_type',
      trace,
      stacks: [{ stack: '_stack' }],
      count: 1,
    };
    test.equal(typeof payload.startTime, 'number');
    delete payload.startTime;
    test.equal(payload, expected);
  }
);

Tinytest.add(
  'Models - Errors - clear data after buildPayload',
  function (test) {
    const model = new ErrorModel('_appId');
    const error = { name: '_name', message: '_message', stack: '_stack' };
    const trace = { type: '_type', subType: '_subType', name: '_name' };
    model.trackError(error, trace);
    test.equal(true, !!model.errors['_type:_message']);
    model.buildPayload();
    test.equal(false, !!model.errors['_type:_message']);
  }
);

Tinytest.add(
  'Models - Errors - buildPayload with same error message',
  function (test) {
    const model = new ErrorModel('_appId');
    const error = { name: '_name', message: '_message', stack: '_stack' };
    const trace = { type: '_type', subType: '_subType', name: '_name' };
    model.trackError(error, trace);
    model.trackError(error, trace);
    model.trackError(error, trace);
    const metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 1);
    const payload = metrics[0];
    const expected = {
      appId: '_appId',
      name: '_message',
      subType: '_subType',
      type: '_type',
      trace,
      stacks: [{ stack: '_stack' }],
      count: 3,
    };
    test.equal(typeof payload.startTime, 'number');
    delete payload.startTime;
    test.equal(payload, expected);
  }
);

Tinytest.add(
  'Models - Errors - buildPayload with different error messages',
  function (test) {
    const model = new ErrorModel('_appId');
    [1, 2, 3].forEach((n) => {
      const error = { name: '_name' + n, message: '_message' + n, stack: '_stack' + n };
      const trace = { type: '_type' + n, subType: '_subType' + n, name: '_name' + n };
      model.trackError(error, trace);
    });

    const metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 3);

    [1, 2, 3].forEach((n) => {
      const payload = metrics[n - 1];
      const trace = { type: '_type' + n, subType: '_subType' + n, name: '_name' + n };
      const expected = {
        appId: '_appId',
        name: '_message' + n,
        subType: '_subType' + n,
        type: '_type' + n,
        trace,
        stacks: [{ stack: '_stack' + n }],
        count: 1,
      };
      test.equal(typeof payload.startTime, 'number');
      delete payload.startTime;
      test.equal(payload, expected);
    });
  }
);

Tinytest.add(
  'Models - Errors - buildPayload with too much errors',
  function (test) {
    const model = new ErrorModel('_appId');
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].forEach((n) => {
      const error = { name: '_name' + n, message: '_message' + n, stack: '_stack' + n };
      const trace = { type: '_type' + n, subType: '_subType' + n, name: '_name' + n };
      model.trackError(error, trace);
    });

    const metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 10);

    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((n) => {
      const payload = metrics[n - 1];
      const trace = { type: '_type' + n, subType: '_subType' + n, name: '_name' + n };
      const expected = {
        appId: '_appId',
        name: '_message' + n,
        subType: '_subType' + n,
        type: '_type' + n,
        trace,
        stacks: [{ stack: '_stack' + n }],
        count: 1,
      };
      test.equal(typeof payload.startTime, 'number');
      delete payload.startTime;
      test.equal(payload, expected);
    });
  }
);

Tinytest.add(
  'Models - Errors - format Error - with Meteor.Error details',
  function (test) {
    const model = new ErrorModel('_appId');
    const details = Random.id();
    const error = new Meteor.Error('code', 'message', details);
    const trace = {};
    const payload = model._formatError(error, trace);

    const hasDetails = payload.stacks[0].stack.indexOf(details);
    test.isTrue(hasDetails >= 0);
  }
);

Tinytest.add(
  'Models - Errors - format Error - with Meteor.Error details, with trace',
  function (test) {
    const model = new ErrorModel('_appId');
    const details = Random.id();
    const error = new Meteor.Error('code', 'message', details);
    const traceError = { stack: 'oldstack' };
    const trace = { events: [0, 1, [0, 1, { error: traceError }]] };

    model._formatError(error, trace);

    const hasDetails = traceError.stack.indexOf(details);
    test.isTrue(hasDetails >= 0);
  }
);

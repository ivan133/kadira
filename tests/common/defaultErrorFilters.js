import { Meteor } from 'meteor/meteor';

Tinytest.add(
  'Default Error Filters - filterValidationErrors - filtered',
  function (test) {
    const err = new Meteor.Error('hello');
    const validated = Kadira.errorFilters.filterValidationErrors(null, undefined, err);
    test.equal(validated, false);
  }
);

Tinytest.add(
  'Default Error Filters - filterValidationErrors - not filtered',
  function (test) {
    const err = new Error('hello');
    const validated = Kadira.errorFilters.filterValidationErrors(null, undefined, err);
    test.equal(validated, true);
  }
);

Tinytest.add(
  'Default Error Filters - filterCommonMeteorErrors - not filtered',
  function (test) {
    const message = 'this is something else';
    const validated = Kadira.errorFilters.filterValidationErrors(null, message);
    test.equal(validated, true);
  }
);

Tinytest.add(
  'Default Error Filters - filterCommonMeteorErrors - ddp heartbeats',
  function (test) {
    const message = 'Connection timeout. No DDP heartbeat received.';
    const validated = Kadira.errorFilters.filterCommonMeteorErrors(null, message);
    test.equal(validated, false);
  }
);

Tinytest.add(
  'Default Error Filters - filterCommonMeteorErrors - sockjs heartbeats',
  function (test) {
    const message = 'Connection timeout. No sockjs heartbeat received.';
    const validated = Kadira.errorFilters.filterCommonMeteorErrors(null, message);
    test.equal(validated, false);
  }
);

Tinytest.add(
  'Default Error Filters - filterCommonMeteorErrors - sockjs invalid state',
  function (test) {
    const message = 'INVALID_STATE_ERR';
    const validated = Kadira.errorFilters.filterCommonMeteorErrors(null, message);
    test.equal(validated, false);
  }
);

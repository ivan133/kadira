import { Meteor } from 'meteor/meteor';
import {
  enableTrackingMethods,
  registerMethod,
  getMeteorClient,
  getLastMethodEvents,
  cleanTestData
} from '../../_helpers/helpers';

Tinytest.add(
  'Async - track with Meteor._wrapAsync',
  function (test) {
    enableTrackingMethods();
    const methodId = registerMethod(function () {
      const wait = Meteor._wrapAsync(function (waitTime, callback) {
        setTimeout(callback, waitTime);
      });
      wait(100);
    });
    const client = getMeteorClient();
    client.call(methodId);
    const events = getLastMethodEvents([0]);
    const expected = [
      ['start'],
      ['wait'],
      ['async'],
      ['complete']
    ];
    test.equal(events, expected);
    cleanTestData();
  }
);

Tinytest.add(
  'Async - track with Meteor._wrapAsync with error',
  function (test) {
    enableTrackingMethods();
    const methodId = registerMethod(function () {
      const wait = Meteor._wrapAsync(function (waitTime, callback) {
        setTimeout(function () {
          callback(new Error('error'));
        }, waitTime);
      });
      try {
        wait(100);
        // eslint-disable-next-line no-empty
      } catch (ex) { }
    });
    const client = getMeteorClient();
    client.call(methodId);
    const events = getLastMethodEvents([0]);
    const expected = [
      ['start'],
      ['wait'],
      ['async'],
      ['complete']
    ];
    test.equal(events, expected);
    cleanTestData();
  }
);

import { TestData } from '../../_helpers/globals';
import {
  enableTrackingMethods,
  registerMethod,
  getMeteorClient,
  getLastMethodEvents,
  cleanTestData
} from '../../_helpers/helpers';

Tinytest.add(
  'User - not logged in',
  function (test) {
    enableTrackingMethods();
    const methodId = registerMethod(function () {
      TestData.insert({ aa: 10 });
    });
    const client = getMeteorClient();
    client.call(methodId);
    const events = getLastMethodEvents([0, 2]);
    const expected = [
      ['start', undefined, { userId: null, params: '[]' }],
      ['wait', undefined, { waitOn: [] }],
      ['db', undefined, { coll: 'tinytest-data', func: 'insert' }],
      ['complete']
    ];
    test.equal(events, expected);
    cleanTestData();
  }
);

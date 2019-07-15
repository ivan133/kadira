import { TestData } from '../../_helpers/globals';
import {
  enableTrackingMethods,
  registerMethod,
  getMeteorClient,
  getLastMethodEvents,
  cleanTestData
} from '../../_helpers/helpers';

Tinytest.add(
  'Base - method params',
  function (test) {
    enableTrackingMethods();
    const methodId = registerMethod(function () {
      TestData.insert({ aa: 10 });
    });
    const client = getMeteorClient();
    client.call(methodId, 10, 'abc');
    const events = getLastMethodEvents([0, 2]);
    const expected = [
      ['start', , { userId: null, params: '[10,"abc"]' }],
      ['wait', , { waitOn: [] }],
      ['db', , { coll: 'tinytest-data', func: 'insert' }],
      ['complete']
    ];
    test.equal(events, expected);
    cleanTestData();
  }
);

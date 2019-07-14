import { HTTP } from 'meteor/http';
import {
  enableTrackingMethods,
  registerMethod,
  getMeteorClient,
  getLastMethodEvents,
  cleanTestData
} from '../../_helpers/helpers';

Tinytest.add(
  'HTTP - call a server',
  function (test) {
    enableTrackingMethods();
    const methodId = registerMethod(function () {
      const result = HTTP.get('http://localhost:3301');
      return result.statusCode;
    });
    const client = getMeteorClient();
    const result = client.call(methodId);
    const events = getLastMethodEvents([0, 2]);
    const expected = [
      ['start', undefined, { userId: null, params: '[]' }],
      ['wait', undefined, { waitOn: [] }],
      ['http', undefined, { url: 'http://localhost:3301', method: 'GET', statusCode: 200 }],
      ['complete']
    ];
    test.equal(events, expected);
    test.equal(result, 200);
    cleanTestData();
  }
);

Tinytest.add(
  'HTTP - async callback',
  function (test) {
    enableTrackingMethods();
    const methodId = registerMethod(function () {
      const Future = Npm.require('fibers/future');
      const f = new Future();
      let result;
      HTTP.get('http://localhost:3301', function (err, res) {
        result = res;
        f.return();
      });
      f.wait();
      return result.statusCode;
    });
    const client = getMeteorClient();
    const result = client.call(methodId);
    const events = getLastMethodEvents([0, 2]);
    const expected = [
      ['start', undefined, { userId: null, params: '[]' }],
      ['wait', undefined, { waitOn: [] }],
      ['http', undefined, { url: 'http://localhost:3301', method: 'GET', async: true }],
      ['async', undefined, {}],
      ['complete']
    ];
    test.equal(events, expected);
    test.equal(result, 200);
    cleanTestData();
  }
);

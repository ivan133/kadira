import { Meteor } from 'meteor/meteor';
import {
  enableTrackingMethods,
  registerMethod,
  getMeteorClient,
  cleanTestData
} from '../../_helpers/helpers';

Tinytest.add(
  'Info - Meteor.EnvironmentVariable',
  function (test) {
    enableTrackingMethods();
    const methodId = registerMethod(testMethod);
    const client = getMeteorClient();
    client.call(methodId, 10, 'abc');
    cleanTestData();

    function testMethod() {
      Meteor.setTimeout(function () {
        const kadirainfo = Kadira._getInfo(null, true);
        test.equal(!!kadirainfo, true);
      }, 0);
    }
  }
);

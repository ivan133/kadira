import { Email } from 'meteor/email';
import {
  enableTrackingMethods,
  registerMethod,
  getMeteorClient,
  getLastMethodEvents,
  cleanTestData
} from '../../_helpers/helpers';

Tinytest.add(
  'Email - success',
  function (test) {
    enableTrackingMethods();
    const methodId = registerMethod(function () {
      Email.send({ from: 'arunoda@meteorhacks.com', to: 'hello@meteor.com' });
    });
    const client = getMeteorClient();
    client.call(methodId);
    const events = getLastMethodEvents([0]);
    const expected = [
      ['start'],
      ['wait'],
      ['email'],
      ['complete']
    ];
    test.equal(events, expected);
    cleanTestData();
  }
);

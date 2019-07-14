import {
  registerMethod,
  getMeteorClient,
} from '../_helpers/helpers';

Tinytest.add(
  'Helpers - ddp server connection',
  function (test) {
    const methodId = registerMethod(function () {
      return 'pong';
    });
    const client = getMeteorClient();
    const result = client.call(methodId);
    test.equal(result, 'pong');
  }
);

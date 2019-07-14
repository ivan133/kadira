import { Meteor } from 'meteor/meteor';
import { WaitTimeBuilder } from '../../lib/server/waitTimeBuilder';

Tinytest.add(
  'WaitTimeBuilder - register and build - clean _messageCache',
  function (test) {
    const wtb = new WaitTimeBuilder();
    const session = {
      id: 'session-id',
      inQueue: [
        { id: 'a' }, { id: 'b' }
      ]
    };

    wtb.register(session, 'myid');
    const build = wtb.build(session, 'myid');
    test.equal(build, [{ id: 'a' }, { id: 'b' }]);
    test.equal(wtb._messageCache.size, 0);
    test.equal(wtb._waitListStore.size, 0);
  }
);

Tinytest.add(
  'WaitTimeBuilder - no inQueue',
  function (test) {
    const wtb = new WaitTimeBuilder();
    const session = {
      id: 'session-id',
      inQueue: null
    };

    wtb.register(session, 'myid');
    const build = wtb.build(session, 'myid');
    test.equal(build, []);
    test.equal(wtb._messageCache.size, 0);
    test.equal(wtb._waitListStore.size, 0);
  }
);

Tinytest.add(
  'WaitTimeBuilder - register and build - cached _messageCache',
  function (test) {
    const wtb = new WaitTimeBuilder();
    const session = {
      id: 'session-id',
      inQueue: [
        { id: 'a' }, { id: 'b' }
      ]
    };

    wtb.register(session, 'myid');
    wtb.register(session, 'myid2');
    const build = wtb.build(session, 'myid');
    test.equal(build, [{ id: 'a' }, { id: 'b' }]);
    test.equal(wtb._messageCache.size, 2);
    test.equal(wtb._waitListStore.size, 1);
  }
);

Tinytest.add(
  'WaitTimeBuilder - register and build - current processing',
  function (test) {
    const wtb = new WaitTimeBuilder();
    const session = {
      id: 'session-id',
      inQueue: [
        { id: 'a' }, { id: 'b' }
      ]
    };
    wtb._currentProcessingMessages.set(session.id, { id: '01' });

    wtb.register(session, 'myid');
    const build = wtb.build(session, 'myid');

    test.equal(build, [{ id: '01' }, { id: 'a' }, { id: 'b' }]);
    test.equal(wtb._messageCache.size, 0);
    test.equal(wtb._waitListStore.size, 0);
  }
);

Tinytest.addAsync(
  'WaitTimeBuilder - track waitTime - with unblock',
  function (test, done) {
    const wtb = new WaitTimeBuilder();
    const session = {
      id: 'session-id',
      inQueue: [
        { id: 'a' }, { id: 'b' }
      ]
    };

    wtb.register(session, 'myid');
    const unblock = wtb.trackWaitTime(session, session.inQueue[0], function () { });
    Meteor.setTimeout(function () {
      unblock();
      const build = wtb.build(session, 'myid');
      test.equal(build[0].waitTime >= 100, true);
      test.equal(wtb._messageCache.size, 0);
      test.equal(wtb._waitListStore.size, 0);
      done();
    }, 200);
  }
);

Tinytest.addAsync(
  'WaitTimeBuilder - track waitTime - without unblock',
  function (test, done) {
    const wtb = new WaitTimeBuilder();
    const session = {
      id: 'session-id',
      inQueue: [
        { id: 'a' }, { id: 'b' }
      ]
    };

    wtb.register(session, 'myid');

    wtb.trackWaitTime(session, session.inQueue[0], function () { });

    Meteor.setTimeout(function () {
      const build = wtb.build(session, 'myid');
      test.equal(build[0].waitTime, undefined);
      test.equal(wtb._messageCache.size, 0);
      test.equal(wtb._waitListStore.size, 0);
      done();
    }, 100);
  }
);

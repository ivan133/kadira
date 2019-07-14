import { Tracer } from '../../../lib/server/tracer/tracer';
import { _ } from 'meteor/underscore';

Tinytest.add(
  'Tracer - Trace Method - method',
  function (test) {
    const ddpMessage = {
      id: 'the-id',
      msg: 'method',
      method: 'method-name'
    };
    const traceInfo = Kadira.tracer.start({ id: 'session-id', userId: 'uid' }, ddpMessage);
    Kadira.tracer.event(traceInfo, 'start', { abc: 100 });
    Kadira.tracer.event(traceInfo, 'end', { abc: 200 });
    removeDate(traceInfo);
    const expected = {
      _id: 'session-id::the-id',
      id: 'the-id',
      session: 'session-id',
      userId: 'uid',
      type: 'method',
      name: 'method-name',
      events: [
        { type: 'start', data: { abc: 100 } },
        { type: 'end', data: { abc: 200 } }
      ]
    };
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - Trace Method - complete after errored',
  function (test) {
    const ddpMessage = {
      id: 'the-id',
      msg: 'method',
      method: 'method-name'
    };
    const traceInfo = Kadira.tracer.start({ id: 'session-id', userId: 'uid' }, ddpMessage);
    Kadira.tracer.event(traceInfo, 'start');
    Kadira.tracer.event(traceInfo, 'error');
    Kadira.tracer.event(traceInfo, 'complete');
    removeDate(traceInfo);
    const expected = {
      _id: 'session-id::the-id',
      id: 'the-id',
      session: 'session-id',
      userId: 'uid',
      type: 'method',
      name: 'method-name',
      events: [
        { type: 'start' },
        { type: 'error' }
      ],
    };
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - trace sub',
  function (test) {
    const ddpMessage = {
      id: 'the-id',
      msg: 'sub',
      name: 'sub-name'
    };
    const traceInfo = Kadira.tracer.start({ id: 'session-id' }, ddpMessage);
    Kadira.tracer.event(traceInfo, 'start', { abc: 100 });
    Kadira.tracer.event(traceInfo, 'end', { abc: 200 });
    removeDate(traceInfo);
    const expected = {
      _id: 'session-id::the-id',
      session: 'session-id',
      id: 'the-id',
      events: [
        { type: 'start', data: { abc: 100 } },
        { type: 'end', data: { abc: 200 } }
      ],
      type: 'sub',
      name: 'sub-name'
    };
    delete traceInfo.userId;
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - trace other ddp',
  function (test) {
    const ddpMessage = {
      id: 'the-id',
      msg: 'unsub',
      name: 'sub-name'
    };
    const traceInfo = Kadira.tracer.start({ id: 'session-id' }, ddpMessage);
    test.equal(traceInfo, null);
  }
);

Tinytest.add(
  'Tracer - trace other events',
  function (test) {
    const ddpMessage = {
      id: 'the-id',
      msg: 'method',
      method: 'method-name'
    };
    const traceInfo = Kadira.tracer.start({ id: 'session-id' }, ddpMessage);
    Kadira.tracer.event(traceInfo, 'start', { abc: 100 });
    const eventId = Kadira.tracer.event(traceInfo, 'db');
    Kadira.tracer.eventEnd(traceInfo, eventId);
    Kadira.tracer.event(traceInfo, 'end', { abc: 200 });
    removeDate(traceInfo);
    const expected = {
      _id: 'session-id::the-id',
      id: 'the-id',
      session: 'session-id',
      type: 'method',
      name: 'method-name',
      events: [
        { type: 'start', data: { abc: 100 } },
        { type: 'db' },
        { type: 'dbend' },
        { type: 'end', data: { abc: 200 } }
      ],
      _lastEventId: null
    };
    delete traceInfo.userId;
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - invalid eventId',
  function (test) {
    const ddpMessage = {
      id: 'the-id',
      msg: 'method',
      method: 'method-name'
    };
    const traceInfo = Kadira.tracer.start({ id: 'session-id' }, ddpMessage);
    Kadira.tracer.event(traceInfo, 'start', { abc: 100 });
    Kadira.tracer.event(traceInfo, 'db');
    Kadira.tracer.event(traceInfo, 'db');
    Kadira.tracer.eventEnd(traceInfo, 'invalid-eventId');
    Kadira.tracer.event(traceInfo, 'end', { abc: 200 });
    delete traceInfo._lastEventId;
    removeDate(traceInfo);
    const expected = {
      _id: 'session-id::the-id',
      id: 'the-id',
      session: 'session-id',
      type: 'method',
      name: 'method-name',
      events: [
        { type: 'start', data: { abc: 100 } },
        { type: 'db' },
        { type: 'end', data: { abc: 200 } }
      ]
    };
    delete traceInfo.userId;
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - end last event',
  function (test) {
    const ddpMessage = {
      id: 'the-id',
      msg: 'method',
      method: 'method-name'
    };
    const traceInfo = Kadira.tracer.start({ id: 'session-id' }, ddpMessage);
    Kadira.tracer.event(traceInfo, 'start', { abc: 100 });
    Kadira.tracer.event(traceInfo, 'db');
    Kadira.tracer.event(traceInfo, 'db');
    Kadira.tracer.endLastEvent(traceInfo);
    Kadira.tracer.event(traceInfo, 'end', { abc: 200 });
    delete traceInfo._lastEventId;
    removeDate(traceInfo);
    const expected = {
      _id: 'session-id::the-id',
      id: 'the-id',
      session: 'session-id',
      type: 'method',
      name: 'method-name',
      events: [
        { type: 'start', data: { abc: 100 } },
        { type: 'db' },
        { type: 'dbend' },
        { type: 'end', data: { abc: 200 } }
      ]
    };
    delete traceInfo.userId;
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - trace same event twice',
  function (test) {
    const ddpMessage = {
      id: 'the-id',
      msg: 'method',
      method: 'method-name'
    };
    const traceInfo = Kadira.tracer.start({ id: 'session-id' }, ddpMessage);
    Kadira.tracer.event(traceInfo, 'start', { abc: 100 });
    const eventId = Kadira.tracer.event(traceInfo, 'db');
    Kadira.tracer.event(traceInfo, 'db');
    Kadira.tracer.eventEnd(traceInfo, eventId);
    Kadira.tracer.event(traceInfo, 'end', { abc: 200 });
    removeDate(traceInfo);
    const expected = {
      _id: 'session-id::the-id',
      id: 'the-id',
      session: 'session-id',
      type: 'method',
      name: 'method-name',
      events: [
        { type: 'start', data: { abc: 100 } },
        { type: 'db' },
        { type: 'dbend' },
        { type: 'end', data: { abc: 200 } }
      ],
      _lastEventId: null
    };
    delete traceInfo.userId;
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - Build Trace - simple',
  function (test) {
    const now = (new Date).getTime();
    const traceInfo = {
      events: [
        { type: 'start', at: now },
        { type: 'wait', at: now },
        { type: 'waitend', at: now + 1000 },
        { type: 'db', at: now + 2000 },
        { type: 'dbend', at: now + 2500 },
        { type: 'complete', at: now + 2500 }
      ]
    };
    Kadira.tracer.buildTrace(traceInfo);
    test.equal(traceInfo.metrics, {
      total: 2500,
      wait: 1000,
      db: 500,
      compute: 1000,
    });
    test.equal(traceInfo.errored, false);
  }
);

Tinytest.add(
  'Tracer - Build Trace - errored',
  function (test) {
    const now = (new Date).getTime();
    const traceInfo = {
      events: [
        { type: 'start', at: now },
        { type: 'wait', at: now },
        { type: 'waitend', at: now + 1000 },
        { type: 'db', at: now + 2000 },
        { type: 'dbend', at: now + 2500 },
        { type: 'error', at: now + 2500 }
      ]
    };
    Kadira.tracer.buildTrace(traceInfo);
    test.equal(traceInfo.metrics, {
      total: 2500,
      wait: 1000,
      db: 500,
      compute: 1000,
    });
    test.equal(traceInfo.errored, true);
  }
);

Tinytest.add(
  'Tracer - Build Trace - no start',
  function (test) {
    const now = (new Date).getTime();
    const traceInfo = {
      events: [
        { type: 'wait', at: now },
        { type: 'waitend', at: now + 1000 },
        { type: 'db', at: now + 2000 },
        { type: 'dbend', at: now + 2500 },
        { type: 'complete', at: now + 2500 }
      ]
    };
    Kadira.tracer.buildTrace(traceInfo);
    test.equal(traceInfo.metrics, undefined);
  }
);

Tinytest.add(
  'Tracer - Build Trace - no complete',
  function (test) {
    const now = (new Date).getTime();
    const traceInfo = {
      events: [
        { type: 'start', at: now },
        { type: 'wait', at: now },
        { type: 'waitend', at: now + 1000 },
        { type: 'db', at: now + 2000 },
        { type: 'dbend', at: now + 2500 }
      ]
    };
    Kadira.tracer.buildTrace(traceInfo);
    test.equal(traceInfo.metrics, undefined);
  }
);

Tinytest.add(
  'Tracer - Build Trace - event not ended',
  function (test) {
    const now = (new Date).getTime();
    const traceInfo = {
      events: [
        { type: 'start', at: now },
        { type: 'wait', at: now },
        { type: 'db', at: now + 2000 },
        { type: 'dbend', at: now + 2500 },
        { type: 'complete', at: now + 2500 }
      ]
    };
    Kadira.tracer.buildTrace(traceInfo);
    test.equal(traceInfo.metrics, undefined);
  }
);

Tinytest.add(
  'Tracer - Filters - filter start',
  function (test) {
    const tracer = new Tracer();
    tracer.addFilter(function (type, data) {
      test.equal(type, 'db');
      return _.pick(data, 'coll');
    });

    const traceInfo = startTrace(tracer);
    tracer.event(traceInfo, 'db', { coll: 'posts', secret: '' });

    const expected = { coll: 'posts' };
    test.equal(traceInfo.events[0].data, expected);
  }
);

Tinytest.add(
  'Tracer - Filters - filter end',
  function (test) {
    const tracer = new Tracer();
    tracer.addFilter(function (type, data) {
      test.equal(type, 'dbend');
      return _.pick(data, 'coll');
    });

    const traceInfo = startTrace(tracer);
    const id = tracer.event(traceInfo, 'db');
    tracer.eventEnd(traceInfo, id, { coll: 'posts', secret: '' });

    const expected = { coll: 'posts' };
    test.equal(traceInfo.events[1].data, expected);
  }
);

Tinytest.add(
  'Tracer - Filters - ignore side effects',
  function (test) {
    const tracer = new Tracer();
    tracer.addFilter(function (type, data) {
      data.someOtherField = 'value';
      return _.pick(data, 'coll');
    });

    const traceInfo = startTrace(tracer);
    tracer.event(traceInfo, 'db', { coll: 'posts', secret: '' });

    const expected = { coll: 'posts' };
    test.equal(traceInfo.events[0].data, expected);
  }
);

Tinytest.add(
  'Tracer - Filters - multiple filters',
  function (test) {
    const tracer = new Tracer();
    tracer.addFilter(function (type, data) {
      return _.pick(data, 'coll');
    });
    tracer.addFilter(function (type, data) {
      data.newField = 'value';
      return data;
    });

    const traceInfo = startTrace(tracer);
    tracer.event(traceInfo, 'db', { coll: 'posts', secret: '' });

    const expected = { coll: 'posts', newField: 'value' };
    test.equal(traceInfo.events[0].data, expected);
  }
);

Tinytest.add(
  'Tracer - Filters - Filter by method name',
  function (test) {
    const tracer = new Tracer();
    tracer.addFilter(function (type, data, info) {
      if (info.type === 'method' && info.name === 'method-name') {
        return _.pick(data, 'coll');
      }
      return data;
    });

    const ddpMessage = {
      id: 'the-id',
      msg: 'method',
      method: 'method-name'
    };
    const info = { id: 'session-id', userId: 'uid' };
    const traceInfo = Kadira.tracer.start(info, ddpMessage);

    tracer.event(traceInfo, 'db', { coll: 'posts', secret: '' });

    const expected = { coll: 'posts' };
    test.equal(traceInfo.events[0].data, expected);
  }
);

Tinytest.add(
  'Tracer - Filters - Filter by sub name',
  function (test) {
    const tracer = new Tracer();
    tracer.addFilter(function (type, data, info) {
      if (info.type === 'sub' && info.name === 'sub-name') {
        return _.pick(data, 'coll');
      }
      return data;
    });

    const ddpMessage = {
      id: 'the-id',
      msg: 'sub',
      name: 'sub-name'
    };
    const info = { id: 'session-id', userId: 'uid' };
    const traceInfo = Kadira.tracer.start(info, ddpMessage);

    tracer.event(traceInfo, 'db', { coll: 'posts', secret: '' });

    const expected = { coll: 'posts' };
    test.equal(traceInfo.events[0].data, expected);
  }
);

function startTrace() {
  const ddpMessage = {
    id: 'the-id',
    msg: 'method',
    method: 'method-name'
  };
  const info = { id: 'session-id', userId: 'uid' };
  const traceInfo = Kadira.tracer.start(info, ddpMessage);

  return traceInfo;
}

function removeDate(traceInfo) {
  traceInfo.events.forEach(function (event) {
    delete event.at;
  });
}

import Future from 'fibers/future';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { MethodStore, TestData } from './globals';

export function getMeteorClient(url = Meteor.absoluteUrl()) {
  return DDP.connect(url, { retry: false });
}

export function registerMethod(F) {
  const id = 'test_' + Random.id();
  const methods = {
    [id]: F
  };
  Meteor.methods(methods);
  return id;
}

export function registerPublication(F) {
  const id = 'test_' + Random.id();
  Meteor.publish(id, F);
  return id;
}

export function enableTrackingMethods() {
  // var original = Kadira.models.methods.processMethod;
  // Kadira.models.methods.processMethod = function(method) {
  //   MethodStore.push(method);
  //   original.call(Kadira.models.methods, method);
  // };
}

export function getLastMethodEvents(_indices) {
  if (MethodStore.length < 1) return [];

  const indices = _indices || [0];

  let events = MethodStore[MethodStore.length - 1].events;
  events = Array.prototype.slice.call(events, 0);
  events = events.filter(isNotCompute);
  events = events.map(filterFields);

  function isNotCompute(event) {
    return event[0] !== 'compute';
  }

  function filterFields(event) {
    const filteredEvent = [];
    indices.forEach((index) => {
      if (event[index]) filteredEvent[index] = event[index];
    });
    return filteredEvent;
  }

  return events;
}

export function getPubSubMetrics() {
  const metricsArr = [];
  for (const dateId of Object.keys(Kadira.models.pubsub.metricsByMinute)) {
    metricsArr.push(Kadira.models.pubsub.metricsByMinute[dateId]);
  }
  return metricsArr;
}

export function findMetricsForPub(pubname) {
  const metrics = getPubSubMetrics();
  const candidates = [];
  for (let lc = 0; lc < metrics.length; lc++) {
    const pm = metrics[lc].pubs[pubname];
    if (pm) {
      candidates.push(pm);
    }
  }

  return candidates[candidates.length - 1];
}

export function getPubSubPayload(detailInfoNeeded) {
  return Kadira.models.pubsub.buildPayload(detailInfoNeeded).pubMetrics;
}

export function wait(time) {
  const f = new Future();
  Meteor.setTimeout(function () {
    f.return();
  }, time);
  f.wait();
  return;
}

export function cleanTestData() {
  if (MethodStore.length) {
    MethodStore.splice(0, MethodStore.length);
  }
  TestData.remove({});
  Kadira.models.pubsub.metricsByMinute = Object.create(null);
  Kadira.models.pubsub.subscriptions = Object.create(null);
}

export function subscribeAndwait(client, ...args) {
  const f = new Future();

  args.push({
    onError: function (err) {
      f.return(err);
    },
    onReady: function () {
      f.return();
    }
  });

  const handler = client.subscribe(...args);
  const error = f.wait();

  if (error) {
    throw error;
  } else {
    return handler;
  }
}

export function compareNear(v1, v2, maxDifference = 30) {
  const diff = Math.abs(v1 - v2);
  return diff < maxDifference;
}

export function closeClient(client) {
  const sessionId = client._lastSessionId;
  client.disconnect();
  const f = new Future();
  function checkClientExtence(sessionId) {
    const sessionExists = Meteor.server.sessions.has(sessionId);
    if (sessionExists) {
      setTimeout(function () {
        checkClientExtence(sessionId);
      }, 20);
    } else {
      f.return();
    }
  }
  checkClientExtence(sessionId);
  return f.wait();
}

export function withDocCacheGetSize(fn, patchedSize) {
  const original = Kadira.docSzCache.getSize;
  Kadira.docSzCache.getSize = function () { return patchedSize; };
  try {
    fn();
  } finally {
    Kadira.docSzCache.getSize = original;
  }
}

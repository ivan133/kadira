import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import {
  enableTrackingMethods,
  getMeteorClient,
  closeClient,
  cleanTestData,
  subscribeAndwait,
  wait,
  getPubSubMetrics,
  findMetricsForPub,
  compareNear,
  getPubSubPayload,
  registerPublication
} from '../../_helpers/helpers';

Tinytest.add(
  'Subscriptions - Sub/Unsub - subscribe only',
  function (test) {
    cleanTestData();
    enableTrackingMethods();
    const client = getMeteorClient();

    const h1 = subscribeAndwait(client, 'tinytest-data');
    const h2 = subscribeAndwait(client, 'tinytest-data');

    const metrics = getPubSubMetrics();
    test.equal(metrics.length, 1);
    test.equal(metrics[0].pubs['tinytest-data'].subs, 2);
    h1.stop();
    h2.stop();
    closeClient(client);
  }
);


Tinytest.add(
  'Subscriptions - Sub/Unsub - subscribe and unsubscribe',
  function (test) {
    cleanTestData();
    enableTrackingMethods();
    const client = getMeteorClient();

    const h1 = subscribeAndwait(client, 'tinytest-data');
    const h2 = subscribeAndwait(client, 'tinytest-data');
    h1.stop();
    h2.stop();
    wait(100);

    const metrics = getPubSubMetrics();
    test.equal(metrics.length, 1);
    test.equal(metrics[0].pubs['tinytest-data'].subs, 2);
    test.equal(metrics[0].pubs['tinytest-data'].unsubs, 2);
    closeClient(client);
  }
);

Tinytest.add(
  'Subscriptions - Response Time - single',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    const pubName = 'pub-' + Random.id();
    Meteor.publish(pubName, function () {
      wait(200);
      this.ready();
    });
    const h1 = subscribeAndwait(client, pubName);
    const metrics = findMetricsForPub(pubName);
    test.isTrue(compareNear(metrics.resTime, 200, 100));
    h1.stop();
    closeClient(client);
  }
);

// Tinytest.add(
//   'Subscriptions - Response Time - multiple',
//   function (test) {
//     enableTrackingMethods();
//     const client = getMeteorClient();
//     const Future = Npm.require('fibers/future');
//     const f = new Future();
//     const h1, h2;
//     h1 = client.subscribe('tinytest-data-multi', function() {
//       f.return();
//     });
//     f.wait();
//     const metrics = getPubSubPayload();
//     const resTimeOne = metrics[0].pubs['tinytest-data-multi'].resTime;
//     wait(700);
//     const H2_SUB;
//     h2 = client.subscribe('tinytest-data-multi');
//     wait(300);
//     const metrics2 = getPubSubPayload();
//     const resTimeTwo = metrics2[0].pubs['tinytest-data-multi'].resTime;
//     test.isTrue(resTimeTwo == 0);
//     h1.stop();
//     h2.stop();
//     cleanTestData();
//   }
// );

Tinytest.add(
  'Subscriptions - Lifetime - sub',
  function (test) {
    cleanTestData();
    enableTrackingMethods();
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    wait(100);
    h1.stop();
    wait(200);
    const metrics = findMetricsForPub('tinytest-data');
    test.isTrue(compareNear(metrics.lifeTime, 100));
    closeClient(client);
  }
);

// // Tinytest.add(
// //   'Subscriptions - Lifetime - null sub',
// //   function (test) {
// //     // test.fail('no pubs for null(autopublish)');
// //     // enableTrackingMethods();
// //     // const client = getMeteorClient();
// //     // const Future = Npm.require('fibers/future');
// //     // const f = new Future();
// //     // const interval = setInterval(function () {
// //     //   if (client.status().connected) {
// //     //     clearInterval(interval);
// //     //     f.return();
// //     //   };
// //     // }, 50);
// //     // f.wait();
// //     // wait(600);
// //     // client.disconnect();
// //     // const metrics = getPubSubMetrics();
// //     // test.equal(metrics[0].pubs['null(autopublish)'].lifeTime > 600, true);
// //     // cleanTestData();
// //   }
// // );

Tinytest.add(
  'Subscriptions - ObserverLifetime - sub',
  function (test) {
    cleanTestData();
    enableTrackingMethods();
    wait(100);
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    wait(500);
    h1.stop();
    closeClient(client);
    wait(500);
    const metrics = findMetricsForPub('tinytest-data');
    test.isTrue(compareNear(metrics.observerLifetime, 500, 100));
  }
);


Tinytest.add(
  'Subscriptions - active subs',
  function (test) {
    cleanTestData();
    enableTrackingMethods();
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    const h2 = subscribeAndwait(client, 'tinytest-data');
    const h3 = subscribeAndwait(client, 'tinytest-data-2');

    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeSubs === 2, true);
    test.equal(payload[0].pubs['tinytest-data-2'].activeSubs === 1, true);
    h1.stop();
    h2.stop();
    h3.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Subscriptions - avoiding multiple ready',
  function (test) {
    cleanTestData();
    enableTrackingMethods();
    let ReadyCounts = 0;
    const pubId = registerPublication(function () {
      this.ready();
      this.ready();
    });
    const original = Kadira.models.pubsub._trackReady;
    Kadira.models.pubsub._trackReady = function (session, sub) {
      if (sub._name === pubId) {
        ReadyCounts++;
      }
    };
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, pubId);

    test.equal(ReadyCounts, 1);
    Kadira.models.pubsub._trackReady = original;
    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Subscriptions - Observer Cache - single publication and single subscription',
  function (test) {
    cleanTestData();
    enableTrackingMethods();
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');

    wait(100);
    const metrics = getPubSubPayload();
    test.equal(metrics[0].pubs['tinytest-data'].totalObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data'].cachedObservers, 0);
    test.equal(metrics[0].pubs['tinytest-data'].avgObserverReuse, 0);

    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Subscriptions - Observer Cache - single publication and multiple subscriptions',
  function (test) {
    cleanTestData();
    enableTrackingMethods();
    const client = getMeteorClient();

    const h1 = subscribeAndwait(client, 'tinytest-data');
    const h2 = subscribeAndwait(client, 'tinytest-data');

    wait(100);
    const metrics = getPubSubPayload();
    test.equal(metrics[0].pubs['tinytest-data'].totalObservers, 2);
    test.equal(metrics[0].pubs['tinytest-data'].cachedObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data'].avgObserverReuse, 0.5);
    h1.stop();
    h2.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Subscriptions - Observer Cache - multiple publication and multiple subscriptions',
  function (test) {
    cleanTestData();
    enableTrackingMethods();
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    const h2 = subscribeAndwait(client, 'tinytest-data-2');

    wait(100);
    const metrics = getPubSubPayload();
    test.equal(metrics[0].pubs['tinytest-data'].totalObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data'].cachedObservers, 0);
    test.equal(metrics[0].pubs['tinytest-data'].avgObserverReuse, 0);

    test.equal(metrics[0].pubs['tinytest-data-2'].totalObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data-2'].cachedObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data-2'].avgObserverReuse, 1);
    h1.stop();
    h2.stop();
    closeClient(client);
  }
);

import {
  getMeteorClient,
  closeClient,
  cleanTestData,
  subscribeAndwait,
  wait,
  getPubSubPayload,
  withDocCacheGetSize
} from '../../_helpers/helpers';
import { TestData } from '../../_helpers/globals';
import { PubsubModel } from '../../../lib/server/models/pubsubModel';

Tinytest.add(
  'Models - PubSub - Metrics - same date',
  function (test) {
    const pub = 'postsList';
    const d = new Date('2013 Dec 10 20:30').getTime();
    const model = new PubsubModel();
    model._getMetrics(d, pub).subs++;
    model._getMetrics(d, pub).subs++;
    const metrics = model._getMetrics(d, pub);
    test.equal(metrics.subs, 2);
  }
);

Tinytest.add(
  'Models - PubSub - Metrics - multi date',
  function (test) {
    const pub = 'postsList';
    const d1 = new Date('2013 Dec 10 20:31:12').getTime();
    const d2 = new Date('2013 Dec 11 20:31:10').getTime();
    const model = new PubsubModel();
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d2, pub).subs++;
    const metrics = [
      model._getMetrics(d1, pub),
      model._getMetrics(d2, pub)
    ];
    test.equal(metrics[0].subs, 2);
    test.equal(metrics[1].subs, 1);
  }
);

Tinytest.add(
  'Models - PubSub - Metrics - same minute',
  function (test) {
    const pub = 'postsList';
    const d1 = new Date('2013 Dec 10 20:31:12').getTime();
    const d2 = new Date('2013 Dec 10 20:31:40').getTime();
    const model = new PubsubModel();
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d2, pub).subs++;
    const metrics = [
      model._getMetrics(d1, pub),
      model._getMetrics(d2, pub)
    ];
    test.equal(metrics[0].subs, 3);
    test.equal(metrics[1].subs, 3);
    test.equal(metrics[0], metrics[1]);
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - subs',
  function (test) {
    const pub = 'postsList';
    const d1 = new Date('2013 Dec 10 20:31:12').getTime();
    const model = new PubsubModel();
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d1, pub).subs++;
    const metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.subs, 3);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - routes',
  function (test) {
    const pub = 'postsList';
    const d1 = new Date('2013 Dec 10 20:31:12').getTime();
    const route = 'route1';
    const model = new PubsubModel();
    model._getMetrics(d1, pub).subRoutes = {};
    model._getMetrics(d1, pub).subRoutes[route] = 0;
    model._getMetrics(d1, pub).subRoutes[route]++;
    model._getMetrics(d1, pub).subRoutes[route]++;
    model._getMetrics(d1, pub).subRoutes[route]++;
    const metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.subRoutes.route1, 3);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - response time',
  function (test) {
    const pub = 'postsList';
    const d1 = new Date('2013 Dec 10 20:31:12').getTime();
    const model = new PubsubModel();
    const modelMetrics = model._getMetrics(d1, pub);
    modelMetrics.resTime = 3000;
    modelMetrics.subs = 3;
    const metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];

    test.equal(metrics[0].pubMetrics[0].pubs.postsList.resTime, 1000);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - lifetime',
  function (test) {
    const pub = 'postsList';
    const d1 = new Date('2013 Dec 10 20:31:12').getTime();
    const model = new PubsubModel();
    const modelMetrics = model._getMetrics(d1, pub);
    modelMetrics.lifeTime = 4000;
    modelMetrics.unsubs = 2;
    const metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];

    test.equal(metrics[0].pubMetrics[0].pubs.postsList.lifeTime, 2000);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - multiple publications',
  function (test) {
    const d1 = new Date('2013 Dec 10 20:31:12').getTime();
    const model = new PubsubModel();
    model._getMetrics(d1, 'postsList').subs = 2;
    model._getMetrics(d1, 'singlePost').subs++;
    const metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.subs, 2);
    test.equal(metrics[0].pubMetrics[0].pubs.singlePost.subs, 1);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - multiple dates',
  function (test) {
    const d1 = new Date('2013 Dec 10 20:31:12').getTime();
    const d2 = new Date('2013 Dec 11 20:31:12').getTime();
    const model = new PubsubModel();
    model._getMetrics(d1, 'postsList').subs = 2;
    model._getMetrics(d2, 'postsList').subs++;
    const metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.subs, 2);
    test.equal(metrics[0].pubMetrics[1].pubs.postsList.subs, 1);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - multiple subscriptions and dates',
  function (test) {
    const d1 = new Date('2013 Dec 10 20:31:12').getTime();
    const d2 = new Date('2013 Dec 11 20:31:12').getTime();
    const model = new PubsubModel();
    model._getMetrics(d1, 'postsList').subs = 2;
    model._getMetrics(d2, 'singlePost').subs++;
    const metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.subs, 2);
    test.equal(metrics[0].pubMetrics[1].pubs.singlePost.subs, 1);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - Observer Cache - no cache',
  function (test) {
    const original = Kadira.syncedDate.getTime;
    const dates = [
      new Date('2013 Dec 10 20:31:12').getTime(),
      new Date('2013 Dec 10 20:31:22').getTime()
    ];
    Kadira.syncedDate.getTime = function () {
      return dates.pop();
    };
    const model = new PubsubModel();
    model.incrementHandleCount({ name: 'postsList' }, false);
    model.incrementHandleCount({ name: 'postsList' }, false);
    const metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.totalObservers, 2);
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.cachedObservers, 0);
    Kadira.syncedDate.getTime = original;
  }
);

Tinytest.add(
  'Models - PubSub - Observer Cache - single cache',
  function (test) {
    const original = Kadira.syncedDate.getTime;
    const dates = [
      new Date('2013 Dec 10 20:31:12').getTime(),
      new Date('2013 Dec 10 20:31:22').getTime()
    ];
    Kadira.syncedDate.getTime = function () {
      return dates.pop();
    };
    const model = new PubsubModel();
    model.incrementHandleCount({ name: 'postsList' }, false);
    model.incrementHandleCount({ name: 'postsList' }, true);
    const metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.totalObservers, 2);
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.cachedObservers, 1);
    Kadira.syncedDate.getTime = original;
  }
);

Tinytest.add(
  'Models - PubSub - Observer Cache - multiple dates',
  function (test) {
    const original = Date.now;
    const dates = [
      new Date('2013 Dec 10 20:31:12').getTime(),
      new Date('2013 Dec 12 20:31:22').getTime()
    ];
    Date.now = function () {
      return dates.pop();
    };
    const model = new PubsubModel();
    model.incrementHandleCount({ name: 'postsList' }, false);
    model.incrementHandleCount({ name: 'postsList' }, true);
    const metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.totalObservers, 1);
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.cachedObservers, 0);
    test.equal(metrics[0].pubMetrics[1].pubs.postsList.totalObservers, 1);
    test.equal(metrics[0].pubMetrics[1].pubs.postsList.cachedObservers, 1);
    Date.now = original;
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Single Sub - simple',
  function (test) {
    cleanTestData();
    [{ data: 'data1' }, { data: 'data2' }, { data: 'data3' }]
      .forEach(doc => TestData.insert(doc));
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    wait(200);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 3);

    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Single Sub - docs added',
  function (test) {
    cleanTestData();
    const docs = [{ data: 'data1' }, { data: 'data2' }, { data: 'data3' }];
    docs.forEach(function (doc) { TestData.insert(doc); });
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    TestData.insert({ data: 'data4' });
    wait(200);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 4);
    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Single Sub - docs removed',
  function (test) {
    cleanTestData();
    const docs = [{ data: 'data1' }, { data: 'data2' }, { data: 'data3' }];
    docs.forEach(function (doc) { TestData.insert(doc); });
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    TestData.remove({ data: 'data3' });
    wait(200);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 2);
    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Single Sub - unsub before payload',
  function (test) {
    cleanTestData();
    const docs = [{ data: 'data1' }, { data: 'data2' }, { data: 'data3' }];
    docs.forEach(function (doc) { TestData.insert(doc); });
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    h1.stop();
    wait(200);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 0);
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Single Sub - close before payload',
  function (test) {
    cleanTestData();
    const docs = [{ data: 'data1' }, { data: 'data2' }, { data: 'data3' }];
    docs.forEach(function (doc) { TestData.insert(doc); });
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    closeClient(client);
    wait(200);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 0);
    h1.stop();
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Multiple Subs - simple',
  function (test) {
    cleanTestData();
    const docs = [{ data: 'data1' }, { data: 'data2' }, { data: 'data3' }];
    docs.forEach(function (doc) { TestData.insert(doc); });
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    const h2 = subscribeAndwait(client, 'tinytest-data');
    const h3 = subscribeAndwait(client, 'tinytest-data');
    wait(200);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 9);
    h1.stop();
    h2.stop();
    h3.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Multiple Subs - sub and unsub',
  function (test) {
    cleanTestData();
    const docs = [{ data: 'data1' }, { data: 'data2' }, { data: 'data3' }];
    docs.forEach(function (doc) { TestData.insert(doc); });
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    const h2 = subscribeAndwait(client, 'tinytest-data');
    const h3 = subscribeAndwait(client, 'tinytest-data');
    h1.stop();
    wait(200);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 6);
    h2.stop();
    h3.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - simple',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    wait(200);
    let payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].createdObservers, 1);
    test.equal(payload[0].pubs['tinytest-data'].deletedObservers, 0);
    h1.stop();
    wait(200);
    payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].deletedObservers, 1);
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - polledDocuments with oplog',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    const h1 = subscribeAndwait(client, 'tinytest-data');
    wait(200);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].polledDocuments, 2);
    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - oplogInsertedDocuments with oplog',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data');
    wait(50);
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    wait(100);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].oplogInsertedDocuments, 2);
    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - oplogDeletedDocuments with oplog',
  function (test) {
    cleanTestData();
    wait(100);
    const client = getMeteorClient();
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    const h1 = subscribeAndwait(client, 'tinytest-data');
    wait(100);
    TestData.remove({});
    wait(100);
    const payload = getPubSubPayload();

    h1.stop();
    closeClient(client);

    test.equal(payload[0].pubs['tinytest-data'].oplogDeletedDocuments, 2);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - oplogUpdatedDocuments with oplog',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    const h1 = subscribeAndwait(client, 'tinytest-data');
    wait(200);
    TestData.update({}, { $set: { kk: 20 } }, { multi: true });
    wait(100);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].oplogUpdatedDocuments, 2);
    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - polledDocuments with no oplog',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    const h1 = subscribeAndwait(client, 'tinytest-data-with-no-oplog');
    wait(200);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data-with-no-oplog'].polledDocuments, 2);
    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - initiallyAddedDocuments',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    // This will create two observers
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    wait(50);
    const h1 = subscribeAndwait(client, 'tinytest-data-random');
    const h2 = subscribeAndwait(client, 'tinytest-data-random');
    wait(100);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data-random'].initiallyAddedDocuments, 4);
    h1.stop();
    h2.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - liveAddedDocuments',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    // This will create two observers
    const h1 = subscribeAndwait(client, 'tinytest-data-random');
    const h2 = subscribeAndwait(client, 'tinytest-data-random');
    wait(50);
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    wait(100);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data-random'].liveAddedDocuments, 4);
    h1.stop();
    h2.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - liveChangedDocuments',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    // This will create two observers
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });

    wait(200);

    const h1 = subscribeAndwait(client, 'tinytest-data-random');
    const h2 = subscribeAndwait(client, 'tinytest-data-random');
    wait(100);
    TestData.update({}, { $set: { kk: 20 } }, { multi: true });
    wait(50);

    const payload = getPubSubPayload();

    h1.stop();
    h2.stop();
    closeClient(client);

    test.equal(payload[0].pubs['tinytest-data-random'].liveChangedDocuments, 4);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - liveRemovedDocuments',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    // This will create two observers
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    const h1 = subscribeAndwait(client, 'tinytest-data-random');
    const h2 = subscribeAndwait(client, 'tinytest-data-random');
    wait(100);
    TestData.remove({});
    wait(50);
    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data-random'].liveRemovedDocuments, 4);
    h1.stop();
    h2.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - initiallySentMsgSize',
  function (test) {
    cleanTestData();

    const client = getMeteorClient();
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    wait(50);
    const h1 = subscribeAndwait(client, 'tinytest-data-random');
    wait(50);

    const payload = getPubSubPayload();

    const templateMsg = '{"msg":"added","collection":"tinytest-data","id":"17digitslongidxxx","fields":{"aa":10}}';
    const expectedMsgSize = templateMsg.length * 2;

    h1.stop();
    closeClient(client);

    test.equal(payload[0].pubs['tinytest-data-random'].initiallySentMsgSize, expectedMsgSize);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - liveSentMsgSize',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    const h1 = subscribeAndwait(client, 'tinytest-data-random');
    wait(50);
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    wait(100);
    const payload = getPubSubPayload();

    const templateMsg = '{"msg":"added","collection":"tinytest-data","id":"17digitslongidxxx","fields":{"aa":10}}';
    const expectedMsgSize = templateMsg.length * 2;

    test.equal(payload[0].pubs['tinytest-data-random'].liveSentMsgSize, expectedMsgSize);

    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - initiallyFetchedDocSize',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    wait(100);

    withDocCacheGetSize(function () {
      const h1 = subscribeAndwait(client, 'tinytest-data-random');
      wait(200);
    }, 30);

    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data-random'].initiallyFetchedDocSize, 60);
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - liveFetchedDocSize',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();

    withDocCacheGetSize(function () {
      const h1 = subscribeAndwait(client, 'tinytest-data-random');
      wait(100);
      TestData.insert({ aa: 10 });
      TestData.insert({ aa: 20 });
      wait(200);
    }, 25);

    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data-random'].liveFetchedDocSize, 50);
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - fetchedDocSize',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });

    let h1;
    withDocCacheGetSize(function () {
      h1 = subscribeAndwait(client, 'tinytest-data-cursor-fetch');
      wait(200);
    }, 30);

    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data-cursor-fetch'].fetchedDocSize, 60);
    h1.stop();
    closeClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - Observers - polledDocSize',
  function (test) {
    cleanTestData();
    const client = getMeteorClient();
    TestData.insert({ aa: 10 });
    TestData.insert({ aa: 20 });
    wait(100);

    let h1;
    withDocCacheGetSize(function () {
      h1 = subscribeAndwait(client, 'tinytest-data-with-no-oplog');
      wait(100);
    }, 30);

    const payload = getPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data-with-no-oplog'].polledDocSize, 60);
    h1.stop();
    closeClient(client);
  }
);

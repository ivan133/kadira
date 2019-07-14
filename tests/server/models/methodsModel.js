import { EJSON } from 'meteor/ejson';
import {
  getMeteorClient,
  cleanTestData,
  wait,
  registerMethod,
  withDocCacheGetSize
} from '../../_helpers/helpers';
import { TestData } from '../../_helpers/globals';
import { MethodsModel } from '../../../lib/server/models/methodsModel';

Tinytest.add(
  'Models - Method - buildPayload simple',
  function (test) {
    const model = new MethodsModel();
    model.processMethod(createMethodCompleted('aa', 'hello', 1, 100, 5));
    model.processMethod(createMethodCompleted('aa', 'hello', 2, 800, 10));
    const payload = model.buildPayload();

    const expected = {
      methodMetrics: [
        {
          startTime: 100,
          methods: {
            hello: {
              count: 2,
              errors: 0,
              wait: 0,
              db: 0,
              http: 0,
              email: 0,
              async: 0,
              compute: 7.5,
              total: 7.5,
              fetchedDocSize: 0,
              sentMsgSize: 0
            }
          }
        }
      ],
      methodRequests: []
    };

    const startTime = expected.methodMetrics[0].startTime;
    expected.methodMetrics[0].startTime = Kadira.syncedDate.syncTime(startTime);

    // TODO comparing without parsing and stringifing fails
    test.equal(EJSON.parse(EJSON.stringify(payload)), EJSON.parse(EJSON.stringify(expected)));
    cleanTestData();
  }
);

Tinytest.add(
  'Models - Method - buildPayload with errors',
  function (test) {
    const model = new MethodsModel();
    model.processMethod(createMethodCompleted('aa', 'hello', 1, 100, 5));
    model.processMethod(createMethodErrored('aa', 'hello', 2, 'the-error', 800, 10));
    const payload = model.buildPayload();

    const expected = [{
      startTime: 100,
      methods: {
        hello: {
          count: 2,
          errors: 1,
          wait: 0,
          db: 0,
          http: 0,
          email: 0,
          async: 0,
          compute: 7.5,
          total: 7.5,
          fetchedDocSize: 0,
          sentMsgSize: 0
        }
      }
    }];
    // TODO comparing without stringify fails
    expected[0].startTime = Kadira.syncedDate.syncTime(expected[0].startTime);

    test.equal(EJSON.parse(EJSON.stringify(payload.methodMetrics)), EJSON.parse(EJSON.stringify(expected)));
    cleanTestData();
  }
);

Tinytest.add(
  'Models - Method - Metrics - fetchedDocSize',
  function (test) {
    const docs = [{ data: 'data1' }, { data: 'data2' }];
    docs.forEach((doc) => TestData.insert(doc));

    const methodId = registerMethod(() => TestData.find({}).fetch());

    const client = getMeteorClient();
    withDocCacheGetSize(() => client.call(methodId), 30);
    wait(100);

    const payload = Kadira.models.methods.buildPayload();
    test.equal(payload.methodMetrics[0].methods[methodId].fetchedDocSize, 60);
    cleanTestData();
  }
);

Tinytest.add(
  'Models - Method - Metrics - sentMsgSize',
  function (test) {
    const docs = [{ data: 'data1' }, { data: 'data2' }];
    docs.forEach((doc) => TestData.insert(doc));

    const returnValue = 'Some return value';
    const methodId = registerMethod(() => {
      TestData.find({}).fetch();
      return returnValue;
    });

    const client = getMeteorClient();
    client.call(methodId);

    const payload = Kadira.models.methods.buildPayload();

    const expected = (JSON.stringify({ msg: 'updated', methods: ['1'] }) +
      JSON.stringify({ msg: 'result', id: '1', result: returnValue })).length;

    test.equal(payload.methodMetrics[0].methods[methodId].sentMsgSize, expected);
    cleanTestData();
  }
);

function createMethodCompleted(sessionName, methodName, methodId, startTime, methodDelay = 5) {
  const method = { session: sessionName, name: methodName, id: methodId, events: [] };
  method.events.push({ type: 'start', at: startTime });
  method.events.push({ type: 'complete', at: startTime + methodDelay });

  return Kadira.tracer.buildTrace(method);
}

function createMethodErrored(sessionName, methodName, methodId, errorMessage, startTime, methodDelay = 5) {
  const method = { session: sessionName, name: methodName, id: methodId, events: [] };
  method.events.push({ type: 'start', at: startTime });
  method.events.push({ type: 'error', at: startTime + methodDelay, data: { error: errorMessage } });

  return Kadira.tracer.buildTrace(method);
}

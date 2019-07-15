import { HTTP } from 'meteor/http';
import { haveAsyncCallback } from '../utils';

const originalCall = HTTP.call;

HTTP.call = function (method, url) {
  const kadiraInfo = Kadira._getInfo();
  const eventId = getEventId(kadiraInfo, { method, url });

  try {
    const response = originalCall(...arguments);

    //if the user supplied an asynCallback, we don't have a response object and it handled asynchronously
    //we need to track it down to prevent issues like: #3
    const endOptions = haveAsyncCallback(arguments) ? { async: true } : { statusCode: response.statusCode };
    if (eventId) {
      Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, endOptions);
    }
    return response;
  } catch (ex) {
    if (eventId) {
      Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, { err: ex.message });
    }
    throw ex;
  }
};

function getEventId(kadiraInfo, { method, url }) {
  if (!kadiraInfo) return null;

  const eventId = Kadira.tracer.event(kadiraInfo.trace, 'http', { method, url });

  return eventId;
}

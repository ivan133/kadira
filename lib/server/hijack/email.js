import { Email } from 'meteor/email';

const originalSend = Email.send;

Email.send = function (options) {
  const kadiraInfo = Kadira._getInfo();
  const eventId = getEventId(kadiraInfo, options);

  try {
    const ret = originalSend.call(this, options);
    if (eventId) {
      Kadira.tracer.eventEnd(kadiraInfo.trace, eventId);
    }
    return ret;
  } catch (ex) {
    if (eventId) {
      Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, { err: ex.message });
    }
    throw ex;
  }
};

function getEventId(kadiraInfo, options) {
  if (!kadiraInfo) return null;

  const { from, to, cc, bcc, replyTo } = options;

  const data = {
    from, to, cc, bcc, replyTo
  };

  const eventId = Kadira.tracer.event(kadiraInfo.trace, 'email', data);

  return eventId;
}

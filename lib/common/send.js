import { Meteor } from 'meteor/meteor';
import { Retry } from 'meteor/retry';
import { httpRequest } from './utils';

Kadira.send = function (payload, path, callback = () => { }) {
  if (!Kadira.connected) {
    throw new Error('You need to connect with Kadira first, before sending messages!');
  }

  const slashedPath = (path.substr(0, 1) !== '/') ? '/' + path : path;
  const endpoint = Kadira.options.endpoint + slashedPath;
  let retryCount = 0;

  const retry = new Retry({
    minCount: 1,
    minTimeout: 0,
    baseTimeout: 1000 * 5,
    maxTimeout: 1000 * 60,
  });

  const sendFunction = Kadira._getSendFunction();

  tryToSend();

  function tryToSend(err) {
    if (retryCount < 5) {
      retry.retryLater(retryCount++, send);
    } else {
      console.warn('Error sending error traces to kadira server');
      callback(err);
    }
  }

  function send() {
    sendFunction(endpoint, payload, (err, content, statusCode) => {
      if (err) {
        tryToSend(err);
      } else if (statusCode === 200) {
        callback(null, content);
      } else {
        callback(new Meteor.Error(statusCode, content));
      }
    });
  }
};

Kadira._getSendFunction = function () {
  return Meteor.isServer ? Kadira._serverSend : Kadira._clientSend;
};

Kadira._clientSend = function (endpoint, payload, callback) {
  const httpOptions = {
    headers: {
      'Content-Type': 'application/json'
    },
    content: JSON.stringify(payload)
  };

  httpRequest('POST', endpoint, httpOptions, function (err, res) {
    if (res) {
      const content = (res.statusCode === 200) ? res.data : res.content;
      callback(null, content, res.statusCode);
    } else {
      callback(err);
    }
  });
};

Kadira._serverSend = function (endpoint, payload, callback = () => { }) {
  const Fiber = Npm.require('fibers');
  new Fiber(function () {
    const httpOptions = {
      data: payload,
      headers: Kadira.options.authHeaders
    };

    httpRequest('POST', endpoint, httpOptions, function (err, res) {
      if (res) {
        const content = (res.statusCode === 200) ? res.data : res.content;
        callback(null, content, res.statusCode);
      } else {
        callback(err);
      }
    });
  }).run();
};

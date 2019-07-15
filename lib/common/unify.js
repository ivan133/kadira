import { Meteor } from 'meteor/meteor';

Kadira = {
  options: {},
  _wrapAsync: Meteor.wrapAsync
};

if (Meteor.isServer) {
  const EventEmitter = Npm.require('events').EventEmitter;
  const eventBus = new EventEmitter();
  eventBus.setMaxListeners(0);

  const buildArgs = function (p1, p2, ...args) {
    const eventName = p1 + '-' + p2;

    return [eventName, ...args];
  };

  Kadira.EventBus = {};

  ['on', 'emit', 'removeListener', 'removeAllListeners'].forEach((m) => {
    Kadira.EventBus[m] = function (...args) {
      const argsWithEventName = buildArgs(...args);
      return eventBus[m].apply(eventBus, argsWithEventName);
    };
  });
}

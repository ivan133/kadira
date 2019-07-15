import { _ } from 'meteor/underscore';

const WAITON_MESSAGE_FIELDS = ['msg', 'id', 'method', 'name', 'waitTime'];

// This is way how we can build waitTime and it's breakdown
export class WaitTimeBuilder {
  constructor() {
    this._waitListStore = new Map();
    this._currentProcessingMessages = new Map();
    this._messageCache = new Map();
  }

  register(session, msgId) {
    const mainKey = this._getMessageKey(session.id, msgId);

    let inQueue = session.inQueue || [];

    if (typeof inQueue.toArray === 'function') {
      // latest version of Meteor uses a double-ended-queue for the inQueue
      // info: https://www.npmjs.com/package/double-ended-queue
      inQueue = inQueue.toArray();
    }

    let waitList = inQueue.map((msg) => {
      const key = this._getMessageKey(session.id, msg.id);
      return this._getCacheMessage(key, msg);
    });

    waitList = waitList || [];

    //add currently processing ddp message if exists
    const currentlyProcessingMessage = this._currentProcessingMessages.get(session.id);
    if (currentlyProcessingMessage) {
      const key = this._getMessageKey(session.id, currentlyProcessingMessage.id);
      waitList.unshift(this._getCacheMessage(key, currentlyProcessingMessage));
    }

    this._waitListStore.set(mainKey, waitList);
  }

  build(session, msgId) {
    const mainKey = this._getMessageKey(session.id, msgId);
    const waitList = this._waitListStore.get(mainKey) || [];
    this._waitListStore.delete(mainKey);

    const filteredWaitList = waitList.map(this._cleanCacheMessage.bind(this));
    return filteredWaitList;
  }

  _getMessageKey(sessionId, msgId) {
    return sessionId + '::' + msgId;
  }

  _getCacheMessage(key, msg) {
    let cachedMessage = this._messageCache.get(key);
    if (!cachedMessage) {
      cachedMessage = _.pick(msg, WAITON_MESSAGE_FIELDS);
      cachedMessage._key = key;
      cachedMessage._registered = 1;
      this._messageCache.set(key, cachedMessage);
    } else {
      cachedMessage._registered++;
    }

    return cachedMessage;
  }

  _cleanCacheMessage(msg) {
    msg._registered--;
    if (msg._registered === 0) {
      this._messageCache.delete(msg._key);
    }

    // need to send a clean set of objects
    // otherwise register can go with this
    return _.pick(msg, WAITON_MESSAGE_FIELDS);
  }

  trackWaitTime(session, msg, unblock) {
    const started = Date.now();
    this._currentProcessingMessages.set(session.id, msg);

    let unblocked = false;
    const wrappedUnblock = () => {
      if (unblocked) return;

      const waitTime = Date.now() - started;

      const key = this._getMessageKey(session.id, msg.id);
      const cachedMessage = this._messageCache.get(key);

      if (cachedMessage) {
        cachedMessage.waitTime = waitTime;
      }

      this._currentProcessingMessages.delete(session.id);

      unblocked = true;

      unblock();
    };

    return wrappedUnblock;
  }
}

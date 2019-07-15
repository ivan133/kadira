import { Meteor } from 'meteor/meteor';
import { Retry } from 'meteor/retry';
import { HTTP } from 'meteor/http';
import { httpRequest } from './utils';

const logger = getLogger();

export class Ntp {
  constructor(endpoint) {
    this.setEndpoint(endpoint);
    this.diff = 0;
    this.synced = false;
    this.reSyncCount = 0;
    this.reSync = new Retry({
      baseTimeout: 1000 * 60,
      maxTimeout: 1000 * 60 * 10,
      minCount: 0
    });
  }

  static _now() {
    const now = Date.now();

    if (typeof now === 'number') {
      return now;
    }

    if (now instanceof Date) {
      // some extenal JS libraries override Date.now and returns a Date object
      // which directly affect us. So we need to prepare for that
      return now.getTime();
    }

    // trust me. I've seen now === undefined
    return new Date().getTime();
  }

  setEndpoint(endpoint) {
    this.endpoint = endpoint + '/simplentp/sync';
  }

  getTime() {
    return Ntp._now() + Math.round(this.diff);
  }

  syncTime(localTime) {
    return localTime + Math.ceil(this.diff);
  }

  sync() {
    logger('init sync');

    const self = this;
    let retryCount = 0;
    const retry = new Retry({
      baseTimeout: 1000 * 20,
      maxTimeout: 1000 * 60,
      minCount: 1,
      minTimeout: 0
    });

    syncTime();

    function syncTime() {
      if (retryCount < 5) {
        logger('attempt time sync with server', retryCount);
        // if we send 0 to the retryLater, cacheDns will run immediately
        retry.retryLater(retryCount++, cacheDns);
      } else {
        logger('maximum retries reached');
        self.reSync.retryLater(self.reSyncCount++, function (...args) {
          self.sync(...args);
        });
      }
    }

    // first attempt is to cache dns. So, calculation does not
    // include DNS resolution time
    function cacheDns() {
      self.getServerTime(function (err) {
        if (!err) {
          calculateTimeDiff();
        } else {
          syncTime();
        }
      });
    }

    function calculateTimeDiff() {
      const clientStartTime = new Date().getTime();

      self.getServerTime((err, serverTime) => {
        if (!err && serverTime) {
          // (Date.now() + clientStartTime)/2 : Midpoint between req and res
          const networkTime = (new Date().getTime() - clientStartTime) / 2;
          const serverStartTime = serverTime - networkTime;
          self.diff = serverStartTime - clientStartTime;
          self.synced = true;
          // we need to send 1 into retryLater.
          self.reSync.retryLater(self.reSyncCount++, (...args) => {
            self.sync(...args);
          });

          logger('successfully updated diff value', self.diff);
        } else {
          syncTime();
        }
      });
    }
  }

  getServerTime(callback) {
    if (Meteor.isServer) {
      const Fiber = Npm.require('fibers');
      new Fiber(() => {
        HTTP.get(this.endpoint, (err, res) => {
          if (err) {
            callback(err);
          } else {
            const serverTime = parseInt(res.content);
            callback(null, serverTime);
          }
        });
      }).run();
    } else {
      httpRequest('GET', this.endpoint, (err, res) => {
        if (err) {
          callback(err);
        } else {
          const serverTime = parseInt(res.content);
          callback(null, serverTime);
        }
      });
    }
  }
}

function getLogger() {
  if (Meteor.isServer) {
    return Npm.require('debug')('kadira:ntp');
  }

  return function (message) {
    const canLogKadira =
      Meteor._localStorage.getItem('LOG_KADIRA') !== null
      && typeof console !== 'undefined';

    if (!canLogKadira) return;

    if (message) {
      arguments[0] = 'kadira:ntp ' + message;
    }

    console.log(...arguments);
  };
}

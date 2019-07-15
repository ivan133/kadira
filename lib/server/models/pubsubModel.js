import { Meteor } from 'meteor/meteor';
const logger = Npm.require('debug')('kadira:pubsub');
import { _ } from 'meteor/underscore';
import { KadiraModel } from './kadiraModel';
import { Ntp } from '../../common/ntp';
import { TracerStore } from '../tracer/tracerStore';

export class PubsubModel extends KadiraModel {
  constructor() {
    super();

    this.metricsByMinute = Object.create(null);
    this.subscriptions = Object.create(null);

    this.tracerStore = new TracerStore({
      interval: 1000 * 60, //process traces every minute
      maxTotalPoints: 30, //for 30 minutes
      archiveEvery: 5 //always trace for every 5 minutes,
    });

    this.tracerStore.start();
  }

  _trackSub(session, msg) {
    logger('SUB:', session.id, msg.id, msg.name, msg.params);
    const publication = this._getPublicationName(msg.name);
    const subscriptionId = msg.id;
    const timestamp = Ntp._now();
    const metrics = this._getMetrics(timestamp, publication);

    metrics.subs++;
    this.subscriptions[subscriptionId] = {
      // We use localTime here, because when we used synedTime we might get
      // minus or more than we've expected
      //   (before serverTime diff changed overtime)
      startTime: timestamp,
      publication,
      params: msg.params,
      id: subscriptionId
    };

    //set session startedTime
    session._startTime = session._startTime || timestamp;
  }

  _trackUnsub(session, sub) {
    logger('UNSUB:', session.id, sub._subscriptionId);
    const publication = this._getPublicationName(sub._name);
    const subscriptionId = sub._subscriptionId;
    const subscriptionState = this.subscriptions[subscriptionId];

    let startTime = null;
    //sometime, we don't have these states
    if (subscriptionState) {
      startTime = subscriptionState.startTime;
    } else {
      //if this is null subscription, which is started automatically
      //hence, we don't have a state
      startTime = session._startTime;
    }

    //in case, we can't get the startTime
    if (startTime) {
      const timestamp = Ntp._now();
      const metrics = this._getMetrics(timestamp, publication);
      //track the count
      if (!!sub._name) {
        // we can't track subs for `null` publications.
        // so we should not track unsubs too
        metrics.unsubs++;
      }
      //use the current date to get the lifeTime of the subscription
      metrics.lifeTime += timestamp - startTime;
      //this is place we can clean the subscriptionState if exists
      delete this.subscriptions[subscriptionId];
    }
  }

  _trackReady(session, sub, trace) {
    logger('READY:', session.id, sub._subscriptionId);
    //use the current time to track the response time
    const publication = this._getPublicationName(sub._name);
    const subscriptionId = sub._subscriptionId;
    const timestamp = Ntp._now();
    const metrics = this._getMetrics(timestamp, publication);

    const subscriptionState = this.subscriptions[subscriptionId];
    if (subscriptionState && !subscriptionState.readyTracked) {
      metrics.resTime += timestamp - subscriptionState.startTime;
      subscriptionState.readyTracked = true;
    }

    if (trace) {
      this.tracerStore.addTrace(trace);
    }
  }

  _trackError(session, sub, trace) {
    logger('ERROR:', session.id, sub._subscriptionId);
    //use the current time to track the response time
    const publication = this._getPublicationName(sub._name);
    const timestamp = Ntp._now();
    const metrics = this._getMetrics(timestamp, publication);

    metrics.errors++;

    if (trace) {
      this.tracerStore.addTrace(trace);
    }
  }

  _getMetrics(timestamp, publication) {
    const dateId = this._getDateId(timestamp);

    if (!this.metricsByMinute[dateId]) {
      this.metricsByMinute[dateId] = {
        // startTime needs to be convert to serverTime before sending to the server
        startTime: timestamp,
        pubs: Object.create(null)
      };
    }

    if (!this.metricsByMinute[dateId].pubs[publication]) {
      this.metricsByMinute[dateId].pubs[publication] = {
        subs: 0,
        unsubs: 0,
        resTime: 0,
        activeSubs: 0,
        activeDocs: 0,
        lifeTime: 0,
        totalObservers: 0,
        cachedObservers: 0,
        createdObservers: 0,
        deletedObservers: 0,
        errors: 0,
        observerLifetime: 0,
        polledDocuments: 0,
        oplogUpdatedDocuments: 0,
        oplogInsertedDocuments: 0,
        oplogDeletedDocuments: 0,
        initiallyAddedDocuments: 0,
        liveAddedDocuments: 0,
        liveChangedDocuments: 0,
        liveRemovedDocuments: 0,
        polledDocSize: 0,
        fetchedDocSize: 0,
        initiallyFetchedDocSize: 0,
        liveFetchedDocSize: 0,
        initiallySentMsgSize: 0,
        liveSentMsgSize: 0
      };
    }

    return this.metricsByMinute[dateId].pubs[publication];
  }

  _getPublicationName(name) {
    return name || 'null(autopublish)';
  }

  _getSubscriptionInfo() {
    const self = this;
    const activeSubs = Object.create(null);
    const activeDocs = Object.create(null);
    const totalObservers = Object.create(null);
    const cachedObservers = Object.create(null);

    Meteor.server.sessions.forEach(session => {
      session._namedSubs.forEach(countSubData);
      session._universalSubs.forEach(countSubData);
    });

    const avgObserverReuse = Object.create(null);
    _.each(totalObservers, function (value, publication) {
      avgObserverReuse[publication] = cachedObservers[publication] / totalObservers[publication];
    });

    return {
      activeSubs,
      activeDocs,
      avgObserverReuse,
    };

    function countSubData(sub) {
      const publication = self._getPublicationName(sub._name);
      countSubscriptions(sub, publication);
      countDocuments(sub, publication);
      countObservers(sub, publication);
    }

    function countSubscriptions(sub, publication) {
      activeSubs[publication] = activeSubs[publication] || 0;
      activeSubs[publication]++;
    }

    function countDocuments(sub, publication) {
      activeDocs[publication] = activeDocs[publication] || 0;

      for (const collectionName of sub._documents.keys()) {
        activeDocs[publication] += sub._documents.get(collectionName).size;
      }
    }

    function countObservers(sub, publication) {
      totalObservers[publication] = totalObservers[publication] || 0;
      cachedObservers[publication] = cachedObservers[publication] || 0;

      totalObservers[publication] += sub._totalObservers;
      cachedObservers[publication] += sub._cachedObservers;
    }
  }

  buildPayload() {
    const metricsByMinute = this.metricsByMinute;
    this.metricsByMinute = Object.create(null);

    const payload = {
      pubMetrics: []
    };

    const subscriptionData = this._getSubscriptionInfo();
    const activeSubs = subscriptionData.activeSubs;
    const activeDocs = subscriptionData.activeDocs;
    const avgObserverReuse = subscriptionData.avgObserverReuse;

    //to the averaging
    for (const dateId of Object.keys(metricsByMinute)) {
      const dateMetrics = metricsByMinute[dateId];
      // We need to convert startTime into actual serverTime
      dateMetrics.startTime = Kadira.syncedDate.syncTime(dateMetrics.startTime);

      for (const publication of Object.keys(metricsByMinute[dateId].pubs)) {
        const singlePubMetrics = metricsByMinute[dateId].pubs[publication];
        // We only calculate resTime for new subscriptions
        singlePubMetrics.resTime /= singlePubMetrics.subs;
        singlePubMetrics.resTime = singlePubMetrics.resTime || 0;
        // We only track lifeTime in the unsubs
        singlePubMetrics.lifeTime /= singlePubMetrics.unsubs;
        singlePubMetrics.lifeTime = singlePubMetrics.lifeTime || 0;

        // Count the average for observer lifetime
        if (singlePubMetrics.deletedObservers > 0) {
          singlePubMetrics.observerLifetime /= singlePubMetrics.deletedObservers;
        }

        // If there are two ore more dateIds, we will be using the currentCount for all of them.
        // We can come up with a better solution later on.
        singlePubMetrics.activeSubs = activeSubs[publication] || 0;
        singlePubMetrics.activeDocs = activeDocs[publication] || 0;
        singlePubMetrics.avgObserverReuse = avgObserverReuse[publication] || 0;
      }

      payload.pubMetrics.push(metricsByMinute[dateId]);
    }

    //collect traces and send them with the payload
    payload.pubRequests = this.tracerStore.collectTraces();

    return payload;
  }

  incrementHandleCount(trace, isCached) {
    const timestamp = Ntp._now();
    const publicationName = this._getPublicationName(trace.name);
    const publication = this._getMetrics(timestamp, publicationName);

    const session = Meteor.server.sessions.get(trace.session);
    let sub;
    if (session) {
      sub = session._namedSubs.get(trace.id);
      if (sub) {
        sub._totalObservers = sub._totalObservers || 0;
        sub._cachedObservers = sub._cachedObservers || 0;
      }
    }
    // not sure, we need to do this? But I don't need to break the however
    sub = sub || { _totalObservers: 0, _cachedObservers: 0 };

    publication.totalObservers++;
    sub._totalObservers++;
    if (isCached) {
      publication.cachedObservers++;
      sub._cachedObservers++;
    }
  }

  trackCreatedObserver(info) {
    const timestamp = Ntp._now();
    const publicationName = this._getPublicationName(info.name);
    const publication = this._getMetrics(timestamp, publicationName);
    publication.createdObservers++;
  }

  trackDeletedObserver(info) {
    const timestamp = Ntp._now();
    const publicationName = this._getPublicationName(info.name);
    const publication = this._getMetrics(timestamp, publicationName);
    publication.deletedObservers++;
    publication.observerLifetime += (new Date()).getTime() - info.startTime;
  }

  trackDocumentChanges(info, op) {
    // It's possibel that info to be null
    // Specially when getting changes at the very begining.
    // This may be false, but nice to have a check
    if (!info) return;

    const timestamp = Ntp._now();
    const publicationName = this._getPublicationName(info.name);
    const publication = this._getMetrics(timestamp, publicationName);
    if (op.op === 'd') {
      publication.oplogDeletedDocuments++;
    } else if (op.op === 'i') {
      publication.oplogInsertedDocuments++;
    } else if (op.op === 'u') {
      publication.oplogUpdatedDocuments++;
    }
  }

  trackPolledDocuments(info, count) {
    const timestamp = Ntp._now();
    const publicationName = this._getPublicationName(info.name);
    const publication = this._getMetrics(timestamp, publicationName);
    publication.polledDocuments += count;
  }

  trackLiveUpdates(info, type, count) {
    const timestamp = Ntp._now();
    const publicationName = this._getPublicationName(info.name);
    const publication = this._getMetrics(timestamp, publicationName);

    if (type === '_addPublished') {
      publication.liveAddedDocuments += count;
    } else if (type === '_removePublished') {
      publication.liveRemovedDocuments += count;
    } else if (type === '_changePublished') {
      publication.liveChangedDocuments += count;
    } else if (type === '_initialAdds') {
      publication.initiallyAddedDocuments += count;
    } else {
      throw new Error('Kadira: Unknown live update type');
    }
  }

  trackDocSize(name, type, size) {
    const timestamp = Ntp._now();
    const publicationName = this._getPublicationName(name);
    const publication = this._getMetrics(timestamp, publicationName);

    if (type === 'polledFetches') {
      publication.polledDocSize += size;
    } else if (type === 'liveFetches') {
      publication.liveFetchedDocSize += size;
    } else if (type === 'cursorFetches') {
      publication.fetchedDocSize += size;
    } else if (type === 'initialFetches') {
      publication.initiallyFetchedDocSize += size;
    } else {
      throw new Error('Kadira: Unknown docs fetched type');
    }
  }

  trackMsgSize(name, type, size) {
    const timestamp = Ntp._now();
    const publicationName = this._getPublicationName(name);
    const publication = this._getMetrics(timestamp, publicationName);

    if (type === 'liveSent') {
      publication.liveSentMsgSize += size;
    } else if (type === 'initialSent') {
      publication.initiallySentMsgSize += size;
    } else {
      throw new Error('Kadira: Unknown docs fetched type');
    }
  }
}

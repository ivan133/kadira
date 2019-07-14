import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

export function getBrowserInfo() {
  return {
    browser: window.navigator.userAgent,
    userId: Meteor.userId && Meteor.userId(),
    url: location.href,
    resolution: getResolution()
  };
}

export function getResolution() {
  if (screen && screen.width && screen.height) {
    return screen.width + 'x' + screen.height;
  }

  return null;
}

export function getErrorStack(zone, callback) {
  const trace = [];
  const eventMap = zone.eventMap || {};
  const infoMap = zone.infoMap || {};

  trace.push({
    at: new Date().getTime(),
    stack: zone.erroredStack.get()
  });

  let currentZone = zone;

  processZone();

  function processZone() {
    // we assume, first two zones are not interesting
    // bacause, they are some internal meteor loading stuffs
    if (currentZone && currentZone.depth > 2) {
      let stack = '';
      if (currentZone.currentStack) {
        stack = currentZone.currentStack.get();
      }

      let events = eventMap[currentZone.id];
      let info = getInfoArray(infoMap[currentZone.id]);
      let ownerArgsEvent = events && events[0] && events[0].type === 'owner-args' && events.shift();
      const runAt = (ownerArgsEvent) ? ownerArgsEvent.at : currentZone.runAt;
      let ownerArgs = (ownerArgsEvent) ? _.toArray(ownerArgsEvent.args) : [];

      // limiting
      events = _.map(_.last(events, 5), checkSizeAndPickFields(100));
      info = _.map(_.last(info, 5), checkSizeAndPickFields(100));
      ownerArgs = checkSizeAndPickFields(200)(_.first(ownerArgs, 5));

      currentZone.owner && delete currentZone.owner.zoneId;

      trace.push({
        createdAt: currentZone.createdAt,
        runAt,
        stack,
        owner: currentZone.owner,
        ownerArgs,
        events,
        info,
        zoneId: currentZone.id
      });

      currentZone = currentZone.parent;

      setTimeout(processZone, 0);
    } else {
      callback(trace);
    }
  }
}

export function getInfoArray(info = {}) {
  return Object.keys(info).map(type => {
    const value = info[type];
    value.type = type;

    return value;
  });
}

export function getTime() {
  if (Kadira && Kadira.syncedDate) {
    return Kadira.syncedDate.getTime();
  }

  return new Date().getTime();
}

export function checkSizeAndPickFields(maxFieldSize = 100) {
  return function (obj = Object.create(null)) {
    const result = Array.isArray(obj) ? [] : Object.create(null);

    for (const [key, value] of Object.entries(obj)) {
      try {
        const valueStringified = JSON.stringify(value);
        if (valueStringified.length > maxFieldSize) {
          result[key] = valueStringified.substr(0, maxFieldSize) + ' ...';
        } else {
          result[key] = value;
        }
      } catch (ex) {
        result[key] = 'Error: cannot stringify value';
      }
    }

    return result;
  };
}

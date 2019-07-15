import pidusage from 'pidusage';
import EventLoopMonitor from 'evloop-monitor';
import { Meteor } from 'meteor/meteor';
import { KadiraModel } from './kadiraModel';
import { Ntp } from '../../common/ntp';

export class SystemModel extends KadiraModel {
  constructor() {
    super();

    this.startTime = Ntp._now();
    this.newSessions = 0;
    this.sessionTimeout = 1000 * 60 * 30; //30 min

    this.usageLookup = Kadira._wrapAsync(pidusage.stat.bind(pidusage));
    this.evloopMonitor = new EventLoopMonitor(200);
    this.evloopMonitor.start();
  }

  buildPayload() {
    const metrics = Object.create(null);
    const now = Ntp._now();
    metrics.startTime = Kadira.syncedDate.syncTime(this.startTime);
    metrics.endTime = Kadira.syncedDate.syncTime(now);

    metrics.sessions = Meteor.server.sessions.size;
    metrics.memory = process.memoryUsage().rss / (1024 * 1024);
    metrics.newSessions = this.newSessions;
    this.newSessions = 0;

    const usage = this.getUsage();
    metrics.pcpu = usage.cpu;
    if (usage.cpuInfo) {
      metrics.cputime = usage.cpuInfo.cpuTime;
      metrics.pcpuUser = usage.cpuInfo.pcpuUser;
      metrics.pcpuSystem = usage.cpuInfo.pcpuSystem;
    }

    // track eventloop blockness
    metrics.pctEvloopBlock = this.evloopMonitor.status().pctBlock;

    this.startTime = now;
    return { systemMetrics: [metrics] };
  }

  getUsage() {
    const usage = this.usageLookup(process.pid) || {};
    Kadira.docSzCache.setPcpu(usage.cpu);
    return usage;
  }

  handleSessionActivity(msg, session) {
    if (msg.msg === 'connect' && !msg.session) {
      this.countNewSession(session);
    } else if (['sub', 'method'].indexOf(msg.msg) !== -1) {
      if (!this.isSessionActive(session)) {
        this.countNewSession(session);
      }
    }
    session._activeAt = Date.now();
  }

  countNewSession(session) {
    if (!isLocalAddress(session.socket)) {
      this.newSessions++;
    }
  }

  isSessionActive(session) {
    const inactiveTime = Date.now() - session._activeAt;
    return inactiveTime < this.sessionTimeout;
  }
}

// ------------------------------------------------------------------------- //

// http://regex101.com/r/iF3yR3/2
const isLocalHostRegex = /^(?:.*\.local|localhost)(?:\:\d+)?|127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/;

// http://regex101.com/r/hM5gD8/1
const isLocalAddressRegex = /^127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/;

function isLocalAddress(socket) {
  const host = socket.headers.host;

  if (host) return isLocalHostRegex.test(host);

  const address = socket.headers['x-forwarded-for'] || socket.remoteAddress;

  if (address) return isLocalAddressRegex.test(address);

  return false;
}

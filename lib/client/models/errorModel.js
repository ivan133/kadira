import { BaseErrorModel } from '../../common/models/baseErrorModel';

export class ErrorModel extends BaseErrorModel {
  constructor({ maxErrorsPerInterval = 10, intervalInMillis = 2 * 60 * 1000, waitForNtpSyncInterval = 0 } = {}) {
    super();

    this.options = {
      maxErrorsPerInterval,
      intervalInMillis,
      waitForNtpSyncInterval
    };

    // errorsSentCount will be reseted at the start of the interval
    this.errorsSentCount = 0;
    this.errorsSent = Object.create(null);

    this.intervalTimeoutHandler = setInterval(() => {
      this.errorsSentCount = 0;
      this._flushErrors();
    }, this.options.intervalInMillis);
  }

  sendError(errorDef, err, force) {
    if (!this.applyFilters('client', errorDef.name, err, errorDef.subType)) {
      return;
    }

    if (!this.canSendErrors()) {
      // reached maximum error count for this interval (1 min)
      return;
    }

    const forceSendError = () => {
      this.sendError(errorDef, err, true);
    };

    const sendError = () => {
      if (!this.errorsSent[errorDef.name]) {
        // sync time with the server
        if (errorDef.startTime) {
          errorDef.startTime = Kadira.syncedDate.syncTime(errorDef.startTime);
        }
        errorDef.count = 1;
        let payload = { host: Kadira.options.hostname, errors: [errorDef] };
        Kadira.send(payload, '/errors');

        this.errorsSent[errorDef.name] = { ...errorDef };
        this.errorsSent[errorDef.name].count = 0;
        this.errorsSentCount++;
      } else {
        this.increamentErrorCount(errorDef.name);
      }
    };

    if (force) {
      sendError();
    } else {
      if (Kadira.syncedDate.synced || this.options.waitForNtpSyncInterval === 0) {
        sendError();
      } else {
        setTimeout(forceSendError, this.options.waitForNtpSyncInterval);
      }
    }
  }

  _flushErrors() {
    const errors = Object.values(this.errorsSent).filter((error) => error.count > 0);

    if (errors.length > 0) {
      Kadira.send({ errors }, '/errors');
    }

    this.errorsSent = Object.create(null);
  }

  isErrorExists(name) {
    return !!this.errorsSent[name];
  }

  increamentErrorCount(name) {
    const error = this.errorsSent[name];
    if (error) {
      error.count++;
    }
  }

  canSendErrors() {
    return this.errorsSentCount < this.options.maxErrorsPerInterval;
  }

  close() {
    clearTimeout(this.intervalTimeoutHandler);
  }
}

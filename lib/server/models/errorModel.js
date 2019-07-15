import { BaseErrorModel } from '../../common/models/baseErrorModel';
import { Ntp } from '../../common/ntp';

export class ErrorModel extends BaseErrorModel {
  constructor(appId) {
    super();

    this.appId = appId;
    this.errors = Object.create(null);
    this.startTime = Date.now();
    this.maxErrors = 10;
  }

  _getDateId(timestamp) {
    const remainder = timestamp % (1000 * 60);
    const dateId = timestamp - remainder;
    return dateId;
  }

  buildPayload() {
    const errors = Object.values(this.errors);
    this.startTime = Ntp._now();

    errors.forEach((error) => {
      error.startTime = Kadira.syncedDate.syncTime(error.startTime);
    });

    this.errors = Object.create(null);

    return { errors };
  }

  errorCount() {
    return Object.values(this.errors).length;
  }

  trackError(ex, trace) {
    const key = trace.type + ':' + ex.message;

    if (this.errors[key]) {
      this.errors[key].count++;
      return;
    }

    if (this.errorCount() < this.maxErrors) {
      const errorDef = this._formatError(ex, trace);

      if (this.applyFilters(errorDef.type, errorDef.name, ex, errorDef.subType)) {
        this.errors[key] = this._formatError(ex, trace);
      }
    }
  }

  _formatError(ex, trace) {
    const time = Date.now();
    let stack = ex.stack;

    // to get Meteor's Error details
    if (ex.details) {
      stack = `Details: ${ex.details} \r\nstack`;
    }

    // Update trace's error event with the next stack
    const errorEvent = trace.events && trace.events[trace.events.length - 1];
    const errorObject = errorEvent && errorEvent[2] && errorEvent[2].error;

    if (errorObject) {
      errorObject.stack = stack;
    }

    return {
      appId: this.appId,
      name: ex.message,
      type: trace.type,
      startTime: time,
      subType: trace.subType || trace.name,
      trace,
      stacks: [{ stack }],
      count: 1,
    };
  }
}

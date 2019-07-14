import { getBrowserInfo } from '../utils';

const prevWindowOnError = window.onerror || Function.prototype;

export function init() {
  window.onerror = function (message, url = '<anonymous>', line = 0, col = 0, error) {
    // track only if error tracking is enabled
    if (!Kadira.options.enableErrorTracking) {
      return prevWindowOnError(message, url, line, col, error);
    }

    const stack = error ? error.stack : `Error:\n    at window.onerror (${url}:${line}:${col})`;
    const now = new Date().getTime();

    Kadira.errors.sendError({
      appId: Kadira.options.appId,
      name: message,
      type: 'client',
      startTime: now,
      subType: 'window.onerror',
      info: getBrowserInfo(),
      stacks: JSON.stringify([{ at: now, events: [], stack }]),
    });

    return prevWindowOnError(message, url, line, col, error);
  };
}

init();

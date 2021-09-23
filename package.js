Package.describe({
  summary: 'Performance Monitoring for Meteor',
  version: '2.32.1',
  git: 'https://github.com/afrokick/kadira.git',
  name: 'afrokick:kadira',
});

Npm.depends({
  'debug': '0.7.4',
  'kadira-core': '1.3.2',
  'pidusage': '1.0.1',
  'evloop-monitor': '0.1.0',
  'lru-cache': '4.0.0',
  'json-stringify-safe': '5.0.1',
});

Package.onUse((api) => {
  configurePackage(api);
  api.export(['Kadira']);
});

Package.onTest((api) => {
  configurePackage(api);
  api.use(['tinytest', 'test-helpers'], ['client', 'server']);

  // common before
  api.addFiles(['tests/common/models/baseErrorModel.js', 'tests/common/ntp.js'], ['client', 'server']);

  // common server
  api.addFiles(
    [
      'tests/server/utils.js',
      'tests/server/jobs.js',
      'tests/_helpers/globals.js',
      'tests/_helpers/helpers.js',
      'tests/_helpers/init.js',
      'tests/server/ping.js',
      'tests/server/hijack/info.js',
      'tests/server/hijack/user.js',
      'tests/server/hijack/email.js',
      'tests/server/hijack/base.js',
      'tests/server/hijack/async.js',
      'tests/server/hijack/http.js',
      'tests/server/hijack/db.js',
      'tests/server/hijack/subscriptions.js',
      'tests/server/hijack/error.js',
      'tests/server/models/methodsModel.js',
      'tests/server/models/pubsubModel.js',
      'tests/server/models/systemModel.js',
      'tests/server/models/errorModel.js',
      'tests/server/tracer/tracerStore.js',
      'tests/server/tracer/tracer.js',
      'tests/server/checkForOplog.js',
      'tests/server/errorTracking.js',
      'tests/server/waitTimeBuilder.js',
      'tests/server/hijack/setLabels.js',
      'tests/server/environmentVariables.js',
      'tests/server/docSizeCache.js',
    ],
    'server'
  );

  // common client
  api.addFiles(
    [
      'tests/client/utils.js',
      'tests/client/errorTracking.js',
      'tests/client/models/errorModel.js',
      'tests/client/errorReporters/windowError.js',
      'tests/client/errorReporters/zone.js',
      'tests/client/errorReporters/meteorDebug.js',
    ],
    'client'
  );

  // common after
  api.addFiles(['tests/common/defaultErrorFilters.js', 'tests/common/send.js'], ['client', 'server']);
});

function configurePackage(api) {
  api.versionsFrom('METEOR@1.11');

  api.use(['ecmascript', 'http@2.0.0', 'random', 'underscore', 'retry'], ['client', 'server']);
  api.use('lamhieu:meteorx@2.1.1', 'server');
  api.use('meteorhacks:zones@1.2.1', { weak: true });

  api.use(['minimongo', 'livedata', 'mongo-livedata', 'ejson', 'ddp-common', 'email@1.0.0||2.0.0-beta||2.0.0'], 'server');
  api.use(['localstorage'], 'client');

  // common before
  api.addFiles(
    [
      'lib/common/unify.js',
      'lib/common/utils.js',
      'lib/common/models/baseErrorModel.js',
      'lib/common/ntp.js'
    ], ['client', 'server']);

  // only server
  api.addFiles(
    [
      'lib/server/jobs.js',
      'lib/server/utils.js',
      'lib/server/waitTimeBuilder.js',
      'lib/server/checkForOplog.js',
      'lib/server/tracer/tracer.js',
      'lib/server/tracer/tracerStore.js',
      'lib/server/models/kadiraModel.js',
      'lib/server/models/methodsModel.js',
      'lib/server/models/pubsubModel.js',
      'lib/server/models/systemModel.js',
      'lib/server/models/errorModel.js',
      'lib/server/docSizeCache.js',
      'lib/server/kadira.js',
      'lib/server/hijack/wrappers/wrapServer.js',
      'lib/server/hijack/wrappers/wrapSession.js',
      'lib/server/hijack/wrappers/wrapSubscription.js',
      'lib/server/hijack/wrappers/wrapObservers.js',
      'lib/server/hijack/wrappers/wrapDDPStringify.js',
      'lib/server/hijack/wrappers/index.js',
      'lib/server/hijack/instrument.js',
      'lib/server/hijack/db.js',
      'lib/server/hijack/http.js',
      'lib/server/hijack/email.js',
      'lib/server/hijack/async.js',
      'lib/server/hijack/error.js',
      'lib/server/hijack/setLabels.js',
      'lib/server/environmentVariables.js',
      'lib/server/autoConnect.js',
    ],
    'server'
  );

  // only client
  api.addFiles(
    [
      'lib/client/utils.js',
      'lib/client/models/errorModel.js',
      'lib/client/errorReporters/zone.js',
      'lib/client/errorReporters/windowError.js',
      'lib/client/errorReporters/meteorDebug.js',
      'lib/client/kadira.js',
    ],
    'client'
  );

  api.addFiles(
    [
      // It's possible to remove this file after some since this just contains
      // a notice to the user.
      // Actual implementation is in the meteorhacks:kadira-profiler package
      'lib/profiler/client.js',
    ],
    'client'
  );

  // common after
  api.addFiles(['lib/common/defaultErrorFilters.js', 'lib/common/send.js'], ['client', 'server']);
}

Package.describe({
  summary: "Authorization package for Meteor",
  version: "2.0.0",
  git: "https://github.com/settlin/meteor-monorepo/roles",
  name: "settlin:roles"
});

Package.onUse(function (api) {
  var both = ['client', 'server'];

  api.versionsFrom("METEOR@1.4.1");

  api.use(['underscore',
           'accounts-base',
           'tracker',
           'mongo',
           'check'], both);

  api.use(['blaze'], 'client', {weak: true});

  api.export('Roles');

  api.addFiles('src/roles_common.js', both);
  api.addFiles('src/roles_server.js', 'server');
  api.addFiles(['src/client/debug.js',
                'src/client/uiHelpers.js',
                'src/client/subscriptions.js'], 'client');
});

Package.onTest(function (api) {
  api.versionsFrom("METEOR@1.4.1");

  var both = ['client', 'server'];

  // `accounts-password` is included so `Meteor.users` exists

  api.use(['settlin:roles',
           'accounts-password',
           'underscore',
           'mongo',
           'tinytest'], both);

  api.addFiles('src/tests/client.js', 'client');
  api.addFiles('src/tests/server.js', 'server');
});

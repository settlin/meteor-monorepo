Package.describe({
  name: 'settlin:astronomy-softremove-behavior',
  version: '3.0.1',
  summary: 'Soft remove behavior for Meteor Astronomy',
  git: 'https://github.com/jagi/meteor-astronomy-softremove-behavior.git'
});

Package.onUse(function(api) {
  api.versionsFrom('1.3');

  api.use([
    'ecmascript',
    'es5-shim',
  ], ['client', 'server']);

  api.mainModule('lib/main.js', ['client', 'server'], { lazy: true });
});

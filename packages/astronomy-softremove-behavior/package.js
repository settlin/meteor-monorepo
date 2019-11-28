Package.describe({
  name: 'settlin:astronomy-softremove-behavior',
  version: '3.0.0',
  summary: 'Soft remove behavior for Meteor Astronomy',
  git: 'https://github.com/jagi/meteor-astronomy-softremove-behavior.git'
});

Package.onUse(function(api) {
  api.versionsFrom('1.3');

  api.use([
    'ecmascript',
    'es5-shim',
    'jagi:astronomy@2.3.4'
  ], ['server']);

  api.mainModule('lib/main.js', ['server']);
});

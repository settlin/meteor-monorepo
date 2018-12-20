Package.describe({
	summary: 'Authorization package for Meteor',
	version: '2.0.0',
	git: 'https://github.com/settlin/meteor-roles.git',
	name: 'settlin:roles-migration',
});

Package.onUse(function(api) {
	const both = ['client', 'server'];
	api.versionsFrom('METEOR@1.4.1');
	api.use(['accounts-base', 'tracker', 'mongo', 'check', 'ecmascript'], both);
	api.mainModule('roles/server/index.js', 'server');
  api.export('Migration');
});

Package.onTest(function(api) {
	const both = ['client', 'server'];
	api.versionsFrom('METEOR@1.4.1');
	api.use(['settlin:roles',
		'accounts-password', // `accounts-password` is included so `Meteor.users` exists
		'mongo',
		'tinytest'], both);
	api.addFiles('roles/tests/server.js', 'server');
});

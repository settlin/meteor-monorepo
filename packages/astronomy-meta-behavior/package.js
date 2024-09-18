Package.describe({
	name: 'settlin:astronomy-meta-behavior',
	version: '3.0.2',
	summary: 'Meta behavior for Meteor Astronomy',
	git: 'https://github.com/settlin/meteor-monorepo.git'
});

Package.onUse(function(api) {
	api.versionsFrom('1.3');

	api.use([
		'ecmascript',
		'es5-shim',
		'jagi:astronomy'
	], ['client', 'server']);

	api.mainModule('lib/main.js', ['client', 'server'], {lazy: true});
});

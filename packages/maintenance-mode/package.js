Package.describe({
	name: 'settlin:meteor-maintenance-mode',
	version: '1.1.8',
	summary: 'Toggle Maintenance Mode For Your App',
	git: 'https://github.com/settlin/meteor-monorepo/tree/master/packages/maintenance-mode',
	documentation: 'README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.4.2.7');
	api.use(['ecmascript', 'webapp']);
	api.mainModule('index.js');
});

Package.onTest(function(api) {
	api.use('ecmascript');
	api.use('tinytest');
	api.use('settlin:meteor-maintenance-mode');
	api.mainModule('tests.js');
});

Package.describe({
	summary: 'A reactive table designed for Meteor + React',
	version: '1.1.6',
	name: 'settlin:reactive-table',
	git: 'https://github.com/settlin/meteor-monorepo.git'
});

Package.on_use(function(api) {
	api.versionsFrom('METEOR@1.4.4.1');
	api.use(['ecmascript', 'mongo', 'react-meteor-data', 'natestrauser:publish-performant-counts', 'tmeasday:check-npm-versions']);
	api.use('check', 'server');

	api.mainModule('src/index.js', ['server', 'client'], {lazy: true});
});

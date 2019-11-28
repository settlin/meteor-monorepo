Package.describe({
	summary: 'A reactive table designed for Meteor + React',
	version: '2.0.1',
	name: 'settlin:reactive-table',
	git: 'https://github.com/settlin/meteor-monorepo.git'
});

Package.on_use(function(api) {
	api.versionsFrom('METEOR@1.4.4.1');
	api.use(['ecmascript', 'mongo', 'react-meteor-data@2.0.0', 'natestrauser:publish-performant-counts@0.1.2']);
	api.use('check', 'server');

	api.mainModule('src/index.js', ['server', 'client'], {lazy: true});
});

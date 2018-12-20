Package.describe({
	summary: 'A reactive table designed for Meteor + React',
	version: '1.1.5',
	name: 'settlin:reactive-table',
	git: 'https://github.com/settlin/meteor-monorepo.git'
});

Package.on_use(function(api) {
	api.versionsFrom('METEOR@1.4.4.1');
	api.use(['ecmascript', 'mongo', 'react-meteor-data@0.2.15', 'natestrauser:publish-performant-counts@0.1.2', 'tmeasday:check-npm-versions@0.3.2']);
	api.use('check', 'server');

	api.mainModule('src/index.js', ['server', 'client'], {lazy: true});
});

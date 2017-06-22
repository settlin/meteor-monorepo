Npm.depends({
	'react': '15.6.1',
	'react-dom': '15.6.1',
});

Package.describe({
	summary: 'A reactive table designed for Meteor + React',
	version: '0.0.3',
	name: 'settlin:reactive-table',
	git: 'https://github.com/settlin/meteor-monorepo.git'
});

Package.on_use(function(api) {
	api.versionsFrom('METEOR@1.4.4.1');
	api.use(['ecmascript', 'mongo', 'react-meteor-data@0.2.12', 'natestrauser:publish-performant-counts@0.1.2']);
	api.use('check', 'server');

	api.mainModule('src/index.js', ['server', 'client']);
});

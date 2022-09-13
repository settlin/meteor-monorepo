Package.describe({
	summary: 'A reactive list designed for Meteor + React',
	version: '1.0.0',
	name: 'settlin:reactive-list',
	git: 'https://github.com/settlin/meteor-monorepo.git'
});

Package.onUse(function(api) {
	api.versionsFrom('METEOR@1.9');
	api.use(['ecmascript', 'check', 'mongo', 'react-meteor-data@2.0.0', 'natestrauser:publish-performant-counts@0.1.2']);

	api.mainModule('server.js', ['server']);
	api.mainModule('components/index.js', ['server', 'client']);
});

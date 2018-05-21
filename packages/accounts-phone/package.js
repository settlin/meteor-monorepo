Package.describe({
	name: 'settlin:accounts-phone',
	version: '1.2.3',
	// Brief, one-line summary of the package.
	summary: 'A login service based on mobile number and otp, For Meteor.',
	// URL to the Git repository containing the source code for this package.
	git: 'https://github.com/settlin/meteor-monorepo/tree/master/packages/accounts-phone',
});

Package.onUse(function(api) {
	api.versionsFrom('1.5');
	api.use('ecmascript');
	api.use('mongo');
	api.use('accounts-base', ['client', 'server']);
	api.imply('accounts-base', ['client', 'server']);
	api.use('check');
	api.use('ddp', ['client', 'server']);
	api.addFiles('server.js', 'server');
	api.addFiles('client.js', 'client');
});

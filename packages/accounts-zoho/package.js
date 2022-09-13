Package.describe({
	name: 'settlin:accounts-zoho',
  summary: "Login service for Zoho accounts",
  version: "1.0.1",
});

Package.onUse(api => {
  api.versionsFrom(['1.4', '2.3']);
	
	api.use(['ecmascript']);
  api.use('accounts-base', ['client', 'server']);
  api.imply('accounts-base', ['client', 'server']);
  api.use('accounts-oauth', ['client', 'server']);

  api.use('oauth2', ['client', 'server']);
  api.use('oauth', ['client', 'server']);
  api.use('fetch@0.1.1', ['server'], );
  api.use('service-configuration');
  api.use('random', 'client');
	api.addFiles('client.js', 'client');
	api.addFiles('server.js', 'server');
});

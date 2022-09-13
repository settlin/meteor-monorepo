Package.describe({
	name: 'settlin:accounts-zoho',
  summary: "Login service for Zoho accounts",
  version: "1.0.0",
});

Package.onUse(api => {
  api.use(['ecmascript']);
  api.use('accounts-base', ['client', 'server']);
  api.imply('accounts-base', ['client', 'server']);
  api.use('accounts-oauth', ['client', 'server']);

  api.use('oauth2', ['client', 'server']);
  api.use('oauth', ['client', 'server']);
  api.use('fetch', ['server']);
  api.use('service-configuration');
  api.use('random', 'client');
	api.addFiles('client.js', 'client');
	api.addFiles('server.js', 'server');
});
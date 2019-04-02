Package.describe({
	name: 'settlin:disable-lazy-for-webpack',
	summary: 'dynimports => static imports',
	version: '0.0.1',
});
Package.onUse(function (api) {
	api.use(['ecmascript', 'jagi:astronomy', 'settlin:astronomy-meta-behavior', 'settlin:astronomy-softremove-behavior'], 'server');
	api.addFiles(['main.js']);
});
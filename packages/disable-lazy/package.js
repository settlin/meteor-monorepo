Package.describe({
	name: 'settlin:disable-lazy-for-webpack',
	summary: 'dynimports => static imports',
	version: '0.0.1',
});
Package.onUse(function (api) {
	api.use(['ecmascript@0.12.4', 'jagi:astronomy@2.7.1', 'settlin:astronomy-meta-behavior@3.0.0', 'settlin:astronomy-softremove-behavior@3.0.0'], 'server');
	api.addFiles(['main.js']);
});
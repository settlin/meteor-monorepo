Package.describe({
	name: "disable-lazy",
	summary: "dynimports => static imports",
	version: "0.0.1",
});
Package.onUse(function (api, where) {
	api.use(['ecmascript', 'jagi:astronomy',]);
	api.addFiles(["main.js"]);
});
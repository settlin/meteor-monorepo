Package.describe({
  name: "settlin:impersonate",
  summary: "Impersonate users in Meteor",
  version: "1.0.0",
  git: "https://github.com/settlin/meteor-monorepo.git",
});

Package.onUse(function (api, where) {

  api.use([
    "accounts-base",
    "reactive-var",
    "tracker",
  ], "client");

  api.use([
    "random",
    "alanning:roles",
  ]);

  api.addFiles([
    "server/lib.js"
  ], "server");

  api.addFiles([
    "client/lib.js"
  ], "client");

  api.export("Impersonate");
});

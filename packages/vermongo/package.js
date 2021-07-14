Package.describe({
  name: 'settlin:vermongo',
  version: '2.0.6',
  summary: 'Add versions to your documents. Implementing vermongo. Automatic versioning of collection documents',
  git: 'https://github.com/settlin/monorepo.git',
  documentation: 'README.md'
});

Package.onUse(function(api) {
	api.versionsFrom(['1.4', '2.3']);
  api.addFiles('vermongo.js');
  api.use([
    'mongo',
    'ecmascript',
    'matb33:collection-hooks@1.1.0',
    'dburles:collection-helpers@1.1.0'
  ]);

  api.export('Vermongo'); // necessary ?
});

/*
Package.onTest(function(api) {
  api.use('tinytest');
  api.addFiles('vermongo.js');
  api.use('matb33:collection-hooks@0.7.11');
  api.use('dburles:collection-helpers@1.0.2');

  api.addFiles('vermongo-tests.js');
});
*/

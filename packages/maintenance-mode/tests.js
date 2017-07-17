// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by meteor-maintenance-mode.js.
import { Maintenance as MaintenanceTest } from "meteor/settlin:meteor-maintenance-mode";

// Write your tests here!
// Here is an example.
Tinytest.add('meteor-maintenance-mode - example', function (test) {
	let m = MaintenanceTest.findOne({_id: 'maintenance'});
  test.equal(m.enabled, false);
});

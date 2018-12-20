// Create default indexes on users collection.
// Index only on "roles._id" is not needed because the combined index works for it as well.
Meteor.users._ensureIndex({'roles._id': 1, 'roles.scope': 1});
Meteor.users._ensureIndex({'roles.scope': 1});

/*
 * Publish logged-in user's roles so client-side checks can work.
 * Use a named publish function so clients can check `ready()` state.
 */
Meteor.publish('_roles', function() {
	if (!this.userId) return [];
	var loggedInUserId = this.userId, fields = {roles: 1};

	return Meteor.users.find({_id: loggedInUserId}, {fields});
});

const {Roles} = require('../common.js');

export {Roles};

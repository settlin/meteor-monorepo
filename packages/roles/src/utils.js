/**
 * @method _addRoleToParent
 * @param {String} roleName Name of role.
 * @param {String} parentName Name of parent role.
 * @returns {Void} nothing
 * @private
 * @static
 */
export const addRoleToParent = function(roleName, parentName) {
	var role,
		count,
		rolesToCheck,
		alreadyCheckedRoles,
		checkRoleName,
		checkRole;

	checkRoleName(roleName);
	checkRoleName(parentName);

	// query to get role's children
	role = Roles.collection.findOne({_id: roleName});

	if (!role) {
		throw new Error("Role '" + roleName + "' does not exist.");
	}

	// detect cycles
	alreadyCheckedRoles = [];
	rolesToCheck = _.pluck(role.children, '_id');
	while (rolesToCheck.length) {
		checkRoleName = rolesToCheck.pop();
		if (checkRoleName === parentName) {
			throw new Error("Roles '" + roleName + "' and '" + parentName + "' would form a cycle.");
		}
		alreadyCheckedRoles.push(checkRoleName);

		checkRole = Roles.collection.findOne({_id: checkRoleName});

		// This should not happen, but this is a problem to address at some other time.
		if (!checkRole) continue;

		rolesToCheck = _.union(rolesToCheck, _.difference(_.pluck(checkRole.children, '_id'), alreadyCheckedRoles));
	}

	count = Roles.collection.update({
		_id: parentName,
		'children._id': {
			$ne: role._id,
		},
	}, {
		$addToSet: {
			children: {
				_id: role._id,
			},
		},
	});

	// if there was no change, parent role might not exist, or role is
	// already a subrole; in any case we do not have anything more to do
	if (!count) return;

	Roles.getUsersInRole(parentName, {
		anyScope: true,
		queryOptions: {
			fields: {
				_id: 1,
				roles: 1,
			},
		},
	}).forEach(function(user) {
		// parent role can be assigned multiple times to the user, for multiple scopes
		// we have to assign a new subrole for each of those scopes
		parentRoles = user.roles.filter(Roles._roleMatcher(parentName)).forEach(function(parentRole) {
			Roles._addUserToRole(user, roleName, {
				scope: parentRole.scope,
				// we are assigning a subrole, so we set it as unassigned,
				// but only if they do not already exist
				_assigned: null,
			});
		});
	});
};

/**
 * Throw an exception if `roleName` is an invalid role name.
 *
 * @method _checkRoleName
 * @param {String} roleName A role name to match against.
 * @returns {Void} nothing
 * @private
 * @static
 */
export const checkRoleName = function(roleName) {
	if (!roleName || !_.isString(roleName) || Roles._trim(roleName) !== roleName) {
		throw new Error("Invalid role name '" + roleName + "'.");
	}
};

/**
 * Resolves the user ID into an actual user object with `roles` field,
 * if it is not already.
 *
 * @method _resolveUser
 * @param {String|Object} user User ID or an actual user object.
 * @param {Boolean} force Load a new user object even if it is already one.
 * @return {Object} User object.
 * @private
 * @static
 */
export const resolveUser = function(user, force) {
	if (typeof user === 'string') return Roles.users.findOne({_id: user}, {fields: {roles: 1}});
	if (force || !user.roles) return Roles.users.findOne({_id: user._id}, {fields: {roles: 1}});
	return user;
};

/**
 * Add one user to one role.
 *
 * @method _addUserToRole
 * @param {String|Object} user User ID or object with an `_id` field.
 * @param {String} roleName Name of the role to add the user to. The role have to exist.
 * @param {Object} options Options:
 *   - `scope`: name of the scope, or `null` for the global role
 *   - `ifExists`: if `true`, do not throw an exception if the role does not exist
 *   - `_assigned`: internal option, should not be used publicly because it will break assumptions
 *     in te code; publicly, you can only add users to an assigned role
 *     should the role be set as assigned (`true`), `null` is the same as `false`,
 *     only that it does not force the value to `false` if the role is already assigned
 * @return {Array} Roles set during the call (even those already set).
 * @returns {Void} nothing
 * @private
 * @static
 */
export const addUserToRole = function(user, roleName, options) {
	checkRoleName(roleName);
	Roles._checkScopeName(options.scope);

	const id = typeof user === 'string' ? user : user._id;
	if (!id) return [];

	const role = Roles.collection.findOne({_id: roleName}, {fields: {children: 1}});

	if (!role) {
		if (options.ifExists) return [];
		throw new Error("Role '" + roleName + "' does not exist.");
	}

	// add new role if it is not already added
	const count = Roles.users.update({
		_id: id,
		roles: {
			$not: {
				$elemMatch: {
					_id: roleName,
					scope: options.scope,
				},
			},
		},

	}, {
		$addToSet: {
			roles: {
				_id: roleName,
				scope: options.scope,
				// we want to make sure it is a boolean value
				assigned: !!options._assigned,
			},
		},
	});

	if (!count) {
		// a role has not been added, it maybe already exists
		if (options._assigned) {
			// let's make sure it is set as assigned
			Roles.users.update({
				_id: id,
				roles: {
					$elemMatch: {
						_id: roleName,
						scope: options.scope,
					},
				},

			}, {
				$set: {
					'roles.$.assigned': true,
				},
			});
		}
		else if (options._assigned === false) {
			// let's make sure it is set as unassigned
			Roles.users.update({
				_id: id,
				roles: {
					$elemMatch: {
						_id: roleName,
						scope: options.scope,
					},
				},

			}, {
				$set: {
					'roles.$.assigned': false,
				},
			});
		}
	}

	return [
		{_id: roleName, scope: options.scope},
		// subroles are set as unassigned, but only if they do not already exist
		...(role.children || []).map(child => addUserToRole(user, child._id, {...options, _assigned: null})),
	];
};

/**
 * Makes sure all subroles are correctly set, and no extra subroles are set which should not be.
 *
 * Used internally after complicated changes, but it can also be used whenever one feels that
 * there might be inconsistencies (eg., after a crash).
 *
 * We simply re-set to the user their assigned roles again and remove any roles which
 * are marked as not explicitly assigned, and have not been part of what we currently set.
 *
 * @method _assureConsistency
 * @param {String|Object} user User ID or an actual user object.
 * @returns {Void} nothing
 * @private
 * @static
 */
export const assureConsistency = function(user) {
	var roles, setRoles;

	// we want always the latest state
	user = resolveUser(user, true);

	// only assigned roles
	roles = user.roles.filter(r => !!r.assigned);

	setRoles = [];
	roles.forEach(function(role) {
		setRoles = setRoles.concat(Roles._addUserToRole(user, role._id, {
			scope: role.scope,
			_assigned: role.assigned, // this is true
			ifExists: true,
		}));
	});

	if (setRoles.length) {
		// remove all extra entries which should not be there
		Roles.users.update(user._id, {
			$pull: {
				roles: {
					$nor: _.map(setRoles, function(role) {return _.pick(role, '_id', 'scope');}),
				},
			},
		});
	}
	else {
		Roles.users.update(user._id, {$set: {roles: []}});
	}
};

/**
 * Remove one user from one role.
 *
 * WARNING: It leaves user's roles in a possibly inconsistent state. Because we allow the same
 * role to be a child of multiple roles it might happen that it removes some subroles which
 * it should not because they are in effect also through some other parent role. You should always
 * call `_assureConsistency` after you are finished with calls to `_removeUserFromRole` for a
 * particular user.
 *
 * @method _removeUserFromRole
 * @param {String|Object} user User ID or object with an `_id` field.
 * @param {String} roleName Name of the role to add the user to. The role have to exist.
 * @param {Object} options Options:
 *   - `scope`: name of the scope, or `null` for the global role
 *   - `_assigned`: internal option, should not be used publicly because it will break assumptions
 *     in te code; publicly, you can only remove users from an assigned role
 *     if `true`, only manually assigned roles are removed, if `false`, only automatically
 *     assigned roles are removed, if `null`, any role is removed
 * @returns {Void} nothing
 * @private
 * @static
 */
export const removeUserFromRole = function(user, roleName, options) {
	var id, role, update;

	checkRoleName(roleName);
	Roles._checkScopeName(options.scope);

	if (_.isObject(user)) {
		id = user._id;
	}
	else {
		id = user;
	}

	if (!id) return;

	update = {
		$pull: {
			roles: {
				_id: roleName,
				scope: options.scope,
			},
		},
	};

	if (options._assigned) {
		update.$pull.roles.assigned = true;
	}
	else if (options._assigned === false) {
		update.$pull.roles.assigned = false;
	}

	// we try to remove the role in every case, whether the role really exists or not
	Roles.users.update(id, update);

	role = Roles.collection.findOne({_id: roleName}, {fields: {children: 1}});

	// role does not exist, we do not anything more
	if (!role) return;

	_.each(role.children, function(child) {
		// if a child role has been assigned explicitly, we do not remove it
		Roles._removeUserFromRole(user, child._id, _.extend({}, options, {_assigned: false}));
	});
};

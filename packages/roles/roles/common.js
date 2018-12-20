/**
 * Provides functions related to user authorization. Compatible with built-in Meteor accounts packages.
 *
 * It uses `roles` field to `Roles.users` documents which is an array of subdocuments with the following
 * schema:
 *  - `_id`: role name
 *  - `scope`: scope name
 *  - `assigned`: boolean, if the role was manually assigned (set), or was automatically inferred (eg., subroles)
 *
 * Roles themselves are accessible throgh `Roles.collection` collection and documents consist of:
 *  - `_id`: role name
 *  - `children`: list of subdocuments:
 *    - `_id`
 *
 * Children list elements are subdocuments so that they can be easier extended in the future or by plugins.
 *
 * Roles can have multiple parents and can be children (subroles) of multiple roles.
 *
 * Example: `{_id: "admin", children: [{_id: "editor"}]}`
 *
 * @module Roles
 */


/**
 * @class Roles
 */
export class Roles {
	constructor({collections = {}} = {}) {
		const {roles = 'roles', users = Meteor.users} = collections;
		if (Roles.collection) throw new Meteor.Error(400, 'Collection can be initialized only once');
		if (typeof roles === Mongo.Collection) Roles.collection = roles;
		else if (typeof roles === 'string') Roles.collection = new Mongo.Collection('roles');
		else throw new Meteor.Error(400, 'Invalid roles collection');

		if (Roles.users) throw new Meteor.Error(400, 'users can be initialized only once');
		if (typeof users === Mongo.Collection) Roles.users = users;
		else throw new Meteor.Error(400, 'Invalid users collection');
	}

	/**
   * Create a new role.
   *
   * @method createRole
   * @param {String} roleName Name of role.
   * @param {Object} [options] Options:
   *   - `unlessExists`: if `true`, exception will not be thrown in the role already exists
   * @return {String} ID of the new role.
   * @static
   */
	static createRole(roleName) {
		checkRoleName(roleName);
		Roles.collection.upsert({_id: roleName}, {$setOnInsert: {children: []}});
	}

	/**
   * Delete an existing role.
   *
   * If the role is set for any user, it is automatically unset.
   *
   * @method deleteRole
   * @param {String} roleName Name of role.
   * @returns {Void} nothing
   * @static
   */
	static deleteRole(roleName) {
		let roles;

		checkRoleName(roleName);

		// we first remove the role as a children, otherwise
		// assureConsistency might re-add the role
		Roles.collection.update({}, {
			$pull: {
				children: {
					_id: roleName,
				},
			},
		}, {multi: true});

		Roles.getUsersInRole(roleName, {
			anyScope: true,
			queryOptions: {
				fields: {
					_id: 1,
					roles: 1,
				},
			},
		}).forEach(function(user) {
			// role can be assigned multiple times to the user, for multiple scopes
			// we have to remove the role for each of those scopes
			roles = user.roles.filter(Roles._roleMatcher(roleName));
			roles.forEach(function(role) {
				removeUserFromRole(user, roleName, {
					scope: role.scope,
					// we want to remove the role in any case
					_assigned: null,
				});
			});

			// handle the edge case
			assureConsistency(user);
		});

		// remove the role itself
		Roles.collection.remove({_id: roleName});
	}

	/**
   * Rename an existing role.
   *
   * @method renameRole
   * @param {String} oldName Old name of a role.
   * @param {String} newName New name of a role.
   * @returns {Void} nothing
   * @static
   */
	renameRole(oldName, newName) {
		var role,
			count;

		checkRoleName(oldName);
		checkRoleName(newName);

		if (oldName === newName) return;

		role = Roles.collection.findOne({_id: oldName});

		if (!role) {
			throw new Error("Role '" + oldName + "' does not exist.");
		}

		role._id = newName;

		Roles.collection.insert(role);

		do {
			count = Roles.users.update({
				roles: {
					$elemMatch: {
						_id: oldName,
					},
				},
			}, {
				$set: {
					'roles.$._id': newName,
				},
			}, {multi: true});
		} while (count > 0);

		do {
			count = Roles.collection.update({
				children: {
					$elemMatch: {
						_id: oldName,
					},
				},
			}, {
				$set: {
					'children.$._id': newName,
				},
			}, {multi: true});
		} while (count > 0);

		Roles.collection.remove({_id: oldName});
	}

	/**
   * Add role parent to roles.
   *
   * Previous parents are kept (role can have multiple parents). For users which have the
   * parent role set, new subroles are added automatically.
   *
   * @method addRolesToParent
   * @param {Array|String} rolesNames Name(s) of role(s).
   * @param {String} parentName Name of parent role.
   * @returns {Void} nothing
   * @static
   */
	addRolesToParent(rolesNames, parentName) {
		// ensure arrays
		if (!Array.isArray(rolesNames)) rolesNames = [rolesNames];

		const {addRoleToParent} = require('./utils');
		rolesNames.forEach(roleName => addRoleToParent(roleName, parentName));
	}
}

Roles.GLOBAL_GROUP = null;

Roles = {...Roles, ...{
	/**
   * Used as a global group (now scope) name. Not used anymore.
   *
   * @property GLOBAL_GROUP
   * @static
   * @deprecated
   */
	GLOBAL_GROUP: null,

	/**
   * Remove role parent from roles.
   *
   * Other parents are kept (role can have multiple parents). For users which have the
   * parent role set, removed subrole is removed automatically.
   *
   * @method removeRolesFromParent
   * @param {Array|String} rolesNames Name(s) of role(s).
   * @param {String} parentName Name of parent role.
   * @returns {Void} nothing
   * @static
   */
	removeRolesFromParent: function(rolesNames, parentName) {
		// ensure arrays
		if (Array.isArray(rolesNames)) rolesNames = [rolesNames];

		_.each(rolesNames, function(roleName) {
			Roles._removeRoleFromParent(roleName, parentName);
		});
	},

	/**
   * @method _removeRoleFromParent
   * @param {String} roleName Name of role.
   * @param {String} parentName Name of parent role.
   * @returns {Void} nothing
   * @private
   * @static
   */
	_removeRoleFromParent: function(roleName, parentName) {
		var role,
			count,
			parentRoles;

		checkRoleName(roleName);
		checkRoleName(parentName);

		// check for role existence
		// this would not really be needed, but we are trying to match addRolesToParent
		role = Roles.collection.findOne({_id: roleName}, {fields: {_id: 1}});

		if (!role) {
			throw new Error("Role '" + roleName + "' does not exist.");
		}

		count = Roles.collection.update({
			_id: parentName,
		}, {
			$pull: {
				children: {
					_id: role._id,
				},
			},
		});

		// if there was no change, parent role might not exist, or role was
		// already not a subrole; in any case we do not have anything more to do
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
			// we have to remove the subrole for each of those scopes
			parentRoles = _.filter(user.roles, Roles._roleMatcher(parentName));
			_.each(parentRoles, function(parentRole) {
				Roles._removeUserFromRole(user, roleName, {
					scope: parentRole.scope,
					// but we want to remove it only if it was not also explicitly assigned
					_assigned: false,
				});
			});

			// handle the edge case
			assureConsistency(user);
		});
	},

	/**
   * Add users to roles.
   *
   * Adds roles to existing roles for each user.
   *
   * @example
   *     Roles.addUsersToRoles(userId, 'admin')
   *     Roles.addUsersToRoles(userId, ['view-secrets'], 'example.com')
   *     Roles.addUsersToRoles([user1, user2], ['user','editor'])
   *     Roles.addUsersToRoles([user1, user2], ['glorious-admin', 'perform-action'], 'example.org')
   *
   * @method addUsersToRoles
   * @param {Array|String} users User ID(s) or object(s) with an `_id` field.
   * @param {Array|String} roles Name(s) of roles to add users to. Roles have to exist.
   * @param {Object|String} [options] Options:
   *   - `scope`: name of the scope, or `null` for the global role
   *   - `ifExists`: if `true`, do not throw an exception if the role does not exist
   *
   * Alternatively, it can be a scope name string.
   * @returns {Void} nothing
   * @static
   */
	addUsersToRoles: function(users, roles, options) {
		if (!users) throw new Error("Missing 'users' param.");
		if (!roles) throw new Error("Missing 'roles' param.");

		options = Roles._normalizeOptions(options);

		// ensure arrays
		if (!_.isArray(users)) users = [users];
		if (!_.isArray(roles)) roles = [roles];

		Roles._checkScopeName(options.scope);

		options = _.defaults(options, {
			ifExists: false,
			// internal option, should not be used publicly because it will break assumptions
			// in te code; publicly, you can only add users to an assigned role
			// should the role be set as assigned, default is `true`; `null` is the same as `false`,
			// only that it does not force the value to `false` if the role is already assigned
			_assigned: true,
		});

		users.forEach(user => roles.forEach(role => Roles._addUserToRole(user, role, options)));
	},

	/**
   * Set users' roles.
   *
   * Replaces all existing roles with a new set of roles.
   *
   * @example
   *     Roles.setUserRoles(userId, 'admin')
   *     Roles.setUserRoles(userId, ['view-secrets'], 'example.com')
   *     Roles.setUserRoles([user1, user2], ['user','editor'])
   *     Roles.setUserRoles([user1, user2], ['glorious-admin', 'perform-action'], 'example.org')
   *
   * @method setUserRoles
   * @param {Array|String} users User ID(s) or object(s) with an `_id` field.
   * @param {Array|String} roles Name(s) of roles to add users to. Roles have to exist.
   * @param {Object|String} [options] Options:
   *   - `scope`: name of the scope, or `null` for the global role
   *   - `ifExists`: if `true`, do not throw an exception if the role does not exist
   *
   * Alternatively, it can be a scope name string.
   * @returns {Void} nothing
   * @static
   */
	setUserRoles: function(users, roles, options) {
		var id;

		if (!users) throw new Error("Missing 'users' param.");
		if (!roles) throw new Error("Missing 'roles' param.");

		options = Roles._normalizeOptions(options);

		// ensure arrays
		if (!_.isArray(users)) users = [users];
		if (!_.isArray(roles)) roles = [roles];

		Roles._checkScopeName(options.scope);

		options = _.defaults(options, {
			ifExists: false,
			// internal option, should not be used publicly because it will break assumptions
			// in te code; publicly, you can only add users to an assigned role
			// should the role be set as assigned, default is `true`; `null` is the same as `false`,
			// only that it does not force the value to `false` if the role is already assigned
			_assigned: true,
		});

		_.each(users, function(user) {
			if (_.isObject(user)) {
				id = user._id;
			}
			else {
				id = user;
			}
			// we first clear all roles for the user
			Roles.users.update(id, {$pull: {roles: {scope: options.scope}}});

			// and then add all
			_.each(roles, function(role) {
				Roles._addUserToRole(user, role, options);
			});
		});
	},

	/**
   * Remove users from assigned roles.
   *
   * @example
   *     Roles.removeUsersFromRoles(userId, 'admin')
   *     Roles.removeUsersFromRoles([userId, user2], ['editor'])
   *     Roles.removeUsersFromRoles(userId, ['user'], 'group1')
   *
   * @method removeUsersFromRoles
   * @param {Array|String} users User ID(s) or object(s) with an `_id` field.
   * @param {Array|String} roles Name(s) of roles to add users to. Roles have to exist.
   * @param {Object|String} [options] Options:
   *   - `scope`: name of the scope, or `null` for the global role
   *
   * Alternatively, it can be a scope name string.
   * @returns {Void} nothing
   * @static
   */
	removeUsersFromRoles: function(users, roles, options) {
		if (!users) throw new Error("Missing 'users' param.");
		if (!roles) throw new Error("Missing 'roles' param.");

		options = Roles._normalizeOptions(options);

		// ensure arrays
		if (!Array.isArray(users)) users = [users];
		if (!Array.isArray(roles)) roles = [roles];

		Roles._checkScopeName(options.scope);

		// internal option, should not be used publicly because it will break assumptions
		// in te code; publicly, you can only remove users from an assigned role
		// when should the role be removed, default is `true` which means only when it is assigned,
		// `false` means when it is not assigned, and `null` means always
		options = {...options, _assigned: true};

		users.forEach(user => {
			roles.forEach(role => Roles._removeUserFromRole(user, role, options));
			// handle the edge case
			assureConsistency(user);
		});
	},

	/**
   * Check if user has specified roles.
   *
   * @example
   *     // global roles
   *     Roles.userIsInRole(user, 'admin')
   *     Roles.userIsInRole(user, ['admin','editor'])
   *     Roles.userIsInRole(userId, 'admin')
   *     Roles.userIsInRole(userId, ['admin','editor'])
   *
   *     // scope roles (global roles are still checked)
   *     Roles.userIsInRole(user, 'admin', 'group1')
   *     Roles.userIsInRole(userId, ['admin','editor'], 'group1')
   *     Roles.userIsInRole(userId, ['admin','editor'], {scope: 'group1'})
   *
   * @method userIsInRole
   * @param {String|Object} user User ID or an actual user object.
   * @param {Array|String} roles Name of role or an array of roles to check against. If array,
   *                             will return `true` if user is in _any_ role.
   *                             Roles do not have to exist.
   * @param {Object|String} [options] Options:
   *   - `scope`: name of the scope; if supplied, limits check to just that scope;
   *     the user's global roles will always be checked whether scope is specified or not
   *   - `anyScope`: if set, role can be in any scope (`scope` option is ignored)
   *
   * Alternatively, it can be a scope name string.
   * @return {Boolean} `true` if user is in _any_ of the target roles
   * @static
   */
	userIsInRole: function(user, roles, options) {
		var id,
			query;

		options = Roles._normalizeOptions(options);

		// ensure array to simplify code
		if (!_.isArray(roles)) roles = [roles];

		if (!roles.length) return false;

		Roles._checkScopeName(options.scope);

		options = _.defaults(options, {
			anyScope: false,
		});

		if (!user) return false;

		if (_.isObject(user)) {
			if (_.has(user, 'roles')) {
				return _.some(roles, function(role) {
					if (options.anyScope) {
						return _.some(user.roles || [], Roles._roleMatcher(role));
					}

					return _.some(user.roles || [], Roles._roleAndScopeMatcher(role, options.scope));
				});
			}
			// missing roles field, try going direct via id
			id = user._id;
		}
		else {
			id = user;
		}

		if (!id) return false;

		if (options.anyScope) {
			query = {
				_id: id,
				'roles._id': {$in: roles},
			};
		}
		else {
			query = {
				_id: id,
				roles: {
					$elemMatch: {
						_id: {$in: roles},
						scope: {$in: [options.scope, null]},
					},
				},
			};
		}

		return !!Roles.users.findOne(query, {fields: {_id: 1}});
	},

	/**
   * Retrieve user's roles.
   *
   * @method getRolesForUser
   * @param {String|Object} user User ID or an actual user object.
   * @param {Object|String} [options] Options:
   *   - `scope`: name of scope to provide roles for; if not specified, global roles are returned
   *   - `anyScope`: if set, role can be in any scope (`scope` option is ignored)
   *   - `fullObjects`: return full roles objects (`true`) or just names (`false`) (default `false`)
   *   - `onlyAssigned`: return only assigned roles and not automatically inferred (like subroles)
   *
   * Alternatively, it can be a scope name string.
   * @return {Array} Array of user's roles, unsorted.
   * @static
   */
	getRolesForUser: function(user, {onlyAssigned, anyScope, fullObjects, scope} = {}) {
		user = resolveUser(user);
		if (!user) return [];

		let roles = user.roles || [];
		if (!anyScope && scope) roles = roles.filter(Roles._scopeMatcher(scope));
		if (onlyAssigned) roles = roles.filter(r => !!r.assigned);
		if (fullObjects) return roles;

		return _.uniq(_.pluck(roles, '_id'));
	},

	/**
   * Retrieve cursor of all existing roles.
   *
   * @method getAllRoles
   * @param {Object} [queryOptions] Options which are passed directly
   *                                through to `Roles.collection.find(query, options)`.
   * @return {Cursor} Cursor of existing roles.
   * @static
   */
	getAllRoles: function(queryOptions) {
		queryOptions = queryOptions || {sort: {_id: 1}};

		return Roles.collection.find({}, queryOptions);
	},

	/**
   * Retrieve all users who are in target role.
   *
   * Options:
   *
   * @method getUsersInRole
   * @param {Array|String} roles Name of role or an array of roles. If array, users
   *                             returned will have at least one of the roles
   *                             specified but need not have _all_ roles.
   *                             Roles do not have to exist.
   * @param {Object|String} [options] Options:
   *   - `scope`: name of the scope to restrict roles to; user's global
   *     roles will also be checked
   *   - `anyScope`: if set, role can be in any scope (`scope` option is ignored)
   *   - `queryOptions`: options which are passed directly
   *     through to `Roles.users.find(query, options)`
   *
   * Alternatively, it can be a scope name string.
   * @param {Object} [queryOptions] Options which are passed directly
   *                                through to `Roles.users.find(query, options)`
   * @return {Cursor} Cursor of users in roles.
   * @static
   */
	getUsersInRole: function(roles, options, queryOptions) {
		var result;

		result = Roles._usersInRoleQuery(roles, options, queryOptions);

		return Roles.users.find(result.query, result.queryOptions);
	},

	/**
   * @method _usersInRoleQuery
   * @param {Array|String} roles Name of role or an array of roles. If array, users
   *                             returned will have at least one of the roles
   *                             specified but need not have _all_ roles.
   *                             Roles do not have to exist.
   * @param {Object|String} [options] Options:
   *   - `scope`: name of the scope to restrict roles to; user's global
   *     roles will also be checked
   *   - `anyScope`: if set, role can be in any scope (`scope` option is ignored)
   *   - `queryOptions`: options which are passed directly
   *     through to `Roles.users.find(query, options)`
   *
   * Alternatively, it can be a scope name string.
   * @param {Object} [queryOptions] Options which are passed directly
   *                                through to `Roles.users.find(query, options)`
   * @return {Object} Object with `query` and `queryOptions`.
   * @private
   * @static
   */
	_usersInRoleQuery: function(roles, options, queryOptions) {
		var query;

		options = Roles._normalizeOptions(options);

		// ensure array to simplify code
		if (!_.isArray(roles)) roles = [roles];

		Roles._checkScopeName(options.scope);

		options = _.defaults(options, {
			queryOptions: queryOptions || {},
			anyScope: false,
		});

		if (options.anyScope) {
			query = {
				'roles._id': {$in: roles},
			};
		}
		else {
			query = {
				roles: {
					$elemMatch: {
						_id: {$in: roles},
						scope: {$in: [options.scope, null]},
					},
				},
			};
		}

		return {
			query: query,
			queryOptions: options.queryOptions,
		};
	},

	/**
   * Retrieve users scopes, if any.
   *
   * @method getScopesForUser
   * @param {String|Object} user User ID or an actual user object.
   * @param {Array|String} [roles] Name of roles to restrict scopes to.
   *
   * @return {Array} Array of user's scopes, unsorted.
   * @static
   */
	getScopesForUser: function(user, roles) {
		var scopes;

		// ensure array to simplify code
		if (roles && !Array.isArray(roles)) roles = [roles];

		user = resolveUser(user);

		if (!user) return [];

		scopes = [];
		(user.roles || []).forEach(function(userRole) {
			// == used on purpose.
			if (userRole.scope === null) return;
			if (roles && !!~roles.indexOf(userRole._id)) return;

			scopes.push(userRole.scope);
		});

		return _.uniq(scopes);
	},

	/**
   * Rename a scope.
   *
   * Roles assigned with a given scope are changed to be under the new scope.
   *
   * @method renameScope
   * @param {String} oldName Old name of a scope.
   * @param {String} newName New name of a scope.
   * @returns {Void} nothing
   * @static
   */
	renameScope: function(oldName, newName) {
		var count;

		Roles._checkScopeName(oldName);
		Roles._checkScopeName(newName);

		if (oldName === newName) return;

		do {
			count = Roles.users.update({
				roles: {
					$elemMatch: {
						scope: oldName,
					},
				},
			}, {
				$set: {
					'roles.$.scope': newName,
				},
			}, {multi: true});
		} while (count > 0);
	},

	/**
   * Remove a scope.
   *
   * Roles assigned with a given scope are removed.
   *
   * @method removeScope
   * @param {String} name The name of a scope.
   * @returns {Void} nothing
   * @static
   */
	removeScope: function(name) {
		Roles._checkScopeName(name);

		Roles.users.update({}, {
			$pull: {
				roles: {
					scope: name,
				},
			},
		}, {multi: true});
	},


	/**
   * @method _roleMatcher
   * @param {String} roleName A role name to match against.
   * @return {Function} A matcher function which accepts a role object and returns `true`
   *                     if its name matches `roleName`.
   * @private
   * @static
   */
	_roleMatcher: function(roleName) {
		return userRole => userRole._id === roleName;
	},

	/**
   * @method _roleAndScopeMatcher
   * @param {String} roleName A role name to match against.
   * @param {String} scope A scope to match against.
   * @return {Function} A matcher function which accepts a role object and returns `true`
   *                     if its name matches `roleName`, and scope matches `scope`.
   * @private
   * @static
   */
	_roleAndScopeMatcher: function(roleName, scope) {
		return function(userRole) {
			// == used on purpose in "userRole.scope == null"
			return (userRole._id === roleName && userRole.scope === scope) ||
        (userRole._id === roleName && (!_.has(userRole, 'scope') || userRole.scope === null));
		};
	},

	/**
   * @method _scopeMatcher
   * @param {String} scope A scope to match against.
   * @return {Function} A matcher function which accepts a role object and returns `true`
   *                    if its scope matches `scope`.
   * @private
   * @static
   */
	_scopeMatcher: function(scope) {
		return function(userRole) {
			// == used on purpose in "userRole.scope == null"
			return (userRole.scope === scope) ||
        (!_.has(userRole, 'scope') || userRole.scope === null);
		};
	},

	/**
   * @method _onlyAssignedMatcher
   * @return {Function} A matcher function which accepts a role object and returns `true`
   *                     if the role is an assigned role.
   * @private
   * @static
   */
	_onlyAssignedMatcher: function() {
		return function(userRole) {
			return !!userRole.assigned;
		};
	},

	/**
   * Normalize options.
   *
   * @method _normalizeOptions
   * @param {Object} options Options to normalize.
   * @return {Object} Normalized options.
   * @private
   * @static
   */
	_normalizeOptions: function(options = {}) {
		if (!options || typeof options === 'string') options = {scope: options};
		return options;
	},

	/**
   * Throw an exception if `scopeName` is an invalid scope name.
   *
   * @method _checkRoleName
   * @param {String} scopeName A scope name to match against.
   * @returns {Void} nothing
   * @private
   * @static
   */
	_checkScopeName: function(scopeName) {
		if (scopeName === null) return;
		if (!scopeName || !_.isString(scopeName) || Roles._trim(scopeName) !== scopeName) throw new Error("Invalid scope name '" + scopeName + "'.");
	},

	/**
   * @param {String} string Input string.
   * @return {String} Trimmed string.
   * @private
   * @static
   */
	_trim: string => string.trim ? string.trim() : string.replace(/^\s+|\s+$/g, ''),
},
};

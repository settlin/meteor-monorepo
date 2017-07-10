// Attempt to log in with phone and password.
//
// @param selector {String|Object} One of the following:
//   - {phone: (phone)}
// @param password {String}
// @param callback {Function(error|undefined)}


/**
 * @summary Log the user in with a password.
 * @locus Client
 * @param {Object} options phone and otp
 * @param {Function} [callback] Optional callback. Called with no arguments on success,
 *      or with a single `Error` argument on failure.
 * @return {Void} null
 */
Meteor.loginWithPhone = function(options, callback) {
	check(options, {phone: String, otp: String});

	options.phone = Accounts.sanitizePhone(options.phone);
	if (!options.phone) {
		callback && callback(new Meteor.Error(404, 'Please provide a phone number for sending otp'));
		return;
	}
	Accounts.callLoginMethod({
		methodArguments: [options],
		userCallback: callback
	});
};

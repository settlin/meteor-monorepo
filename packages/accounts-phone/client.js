// Attempt to log in with phone and password.
//
// @param selector {String|Object} One of the following:
//   - {phone: (phone)}
// @param password {String}
// @param callback {Function(error|undefined)}

/**
 * @summary Log the user in with a password. Indian phone numbers are accepted without 91. For others, the country code is required. Uses https://github.com/halt-hammerzeit/libphonenumber-js, as dynamic import
 * @locus Server
 * @param {String}  phone phone number
 * @return {String} sanitized phone number. Tweaked for Indian numbers, but works for other countries as well.
 */
Accounts.sanitizePhone = async function(phone) {
	check(phone, String);
	if (!phone) return null;

	var nums = phone.split(/,|;/);
	for (var i = 0; i < nums.length; i++) {
		// trim and remove all hyphens, spaces
		var ph = nums[i].replace(/[^\d^+]/g, '').replace(/^0+/g, '');
		if (!ph) continue;
		if (ph.indexOf('+') !== 0) {
			if (ph.length === 10 && !!~['7', '8', '9'].indexOf(ph.substr(0, 1))) ph = '+91' + ph;
			else ph = '+' + ph;
		}
		const {parse} = await import('libphonenumber-js');
		var res = parse(ph, {country: {default: 'IN'}});
		if (!res.country) continue;
		return ph;
	}
	return null;
};

/**
 * @summary Log the user in with a password.
 * @locus Client
 * @param {Object} options phone and otp
 * @param {Function} [callback] Optional callback. Called with no arguments on success,
 *      or with a single `Error` argument on failure.
 * @return {Void} null
 */
Meteor.loginWithPhone = async function(options, callback) {
	check(options, {phone: String, otp: String, purpose: Match.Maybe(String)});

	options.phone = await Accounts.sanitizePhone(options.phone);
	if (!options.phone) {
		callback && callback(new Meteor.Error(404, 'Please provide a valid phone number for sending otp'));
		return;
	}
	Accounts.callLoginMethod({
		methodArguments: [options],
		userCallback: callback
	});
};

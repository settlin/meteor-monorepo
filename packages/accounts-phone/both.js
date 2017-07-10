/**
 * @summary Log the user in with a password.
 * @locus Both
 * @param {String}  phone phone number
 * @return {String} sanitized phone number. Tweaked for Indian numbers, but works for other countries as well. Uses https://github.com/settlin/phoneparser.git
 */

Accounts.sanitizePhone = function(phone) {
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
		const { parse } = require('libphonenumber-js');
		var res = parse(ph, {country: {default: 'IN'}});
		if (!res.country) continue;
		return ph;
	}
	return null;
};

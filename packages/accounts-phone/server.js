import {Mongo} from 'meteor/mongo';
Meteor.otps = new Mongo.Collection('__otps');
Meteor.otps._ensureIndex({phone: 1, purpose: 1}, {unique: true, name: 'phoneAndPurpose'});

const otpPurpose = '__login__';

///
/// ERROR HANDLER
///
const handleError = ({msg, throwError, details}) => {
	throwError = typeof throwError === 'undefined' ? true : throwError;
	let error = new Meteor.Error(
		403,
		Accounts._options.ambiguousErrorMessages
			? 'Login failure. Please check your login credentials.'
			: msg,
		details
	);
	if (throwError) {
		throw error;
	}
	return error;
};

Accounts.sanitizePhone = function(phone) {
	check(phone, String);
	if (!phone) return null;

	let nums = phone.split(/,|;/);
	for (var i = 0; i < nums.length; i++) {
		// trim and remove all hyphens, spaces
		let ph = nums[i].replace(/[^\d^+]/g, '').replace(/^0+/g, '');
		if (!ph) continue;
		const {parse} = require('libphonenumber-js');
		let res = parse(ph);
		if (!res.country) continue;
		return ph;
	}
	return null;
};


///
/// LOGIN
///
/**
 * @summary finds user by doing a phone number search. Throws error if multiple found.
 * @param {String} phone phone number.
 * @return {Object} user document
 */
Accounts.findUserByPhone = function(phone) {
	check(phone, String);
	phone = Accounts.sanitizePhone(phone);
	if (!phone) return null;
	const users = Meteor.users.find({phones: {$elemMatch: {number: phone, verified: true}}}).fetch();
	if (users.length > 1) throw new Meteor.Error(403, 'Multiple users with same phone');
	return users[0] || null;
};

// Handler to login with a phone and otp.
/**
 * @summary adds a login handler for phone or an Object into an array,if not already present
 * @param {Object/String} value to be added.
 * @return {Object} object with user_id, and data that is to be inserted while creating user
 */
Accounts.registerLoginHandler('phone', function(options) {
	if (!options.phone || !options.otp) return undefined; // eslint-disable-line no-undefined
	let verified = false;
	try {
		check(options, {phone: String, otp: String, purpose: Match.Maybe(String)});
		let {phone, otp, purpose} = options;
		phone = Accounts.sanitizePhone(phone);

		const phn = Accounts.verifyPhoneOtp({phone, otp, purpose});
		if (phn) verified = true;

		let user = Accounts.findUserByPhone(phone);
		if (!user) {
			let userId = createUser({phone});
			return {userId};
		}
		return {userId: user._id};
	}
	catch (e) {
		console.error('Phone login failed:', e); // eslint-disable-line no-console
		return {userId: null, error: handleError({msg: e.reason || JSON.stringify(e), details: {verified}})};
	}
});

/**
 * @summary Set the otp for a user.
 * @locus Server
 * @param {String} phone phone number.
 * @param {String} otp OTP
 * @returns {Void} null
 */
Accounts.setPhoneOtp = function(phone, otp) {
	check([phone, otp], [String]);
	phone = Accounts.sanitizePhone(phone);
	if (!phone) throw new Meteor.Error(403, 'Improper phone number');
	Meteor.otps.remove({phone, purpose: otpPurpose});
	Meteor.otps.insert({phone, otp, purpose: otpPurpose, createdAt: new Date()});
};

/**
 * @summary Verify the otp for a user.
 * @locus Server
 * @param {String} phone phone number.
 * @param {String} otp OTP
 * @returns {String} Sanitized phone number
 */
Accounts.verifyPhoneOtp = function({phone, otp, purpose = ''}) {
	check([phone, otp, purpose], [String]);
	if (!purpose) purpose = otpPurpose;
	phone = Accounts.sanitizePhone(phone);
	if (!phone) throw new Meteor.Error(500, 'Invalid phone number');

	const otpDoc = Meteor.otps.findOne({phone, purpose});
	if (!otpDoc) throw new Meteor.Error(403, 'User has no otp set');
	if (otpDoc.otp !== otp) throw new Meteor.Error(403, 'Incorrect otp');

	//mark exisiting user verified
	const user = Meteor.users.find({'phones.number': phone}).fetch();
	if (user.length === 1) Meteor.users.update({'phones.number': phone}, {$set: {'phones.$.verified': true}});

	Meteor.otps.remove({phone: phone, purpose});
	return phone;
};

/**
 * @summary Add a phone number for a user. Use this instead of directly
 * updating the database. The operation will fail if there is a different user
 * with same phone.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} newPhone A new phone number for the user.
 * @param {Boolean} [verified] Optional - whether the new phone number should
 * be marked as verified. Defaults to false.
 * @returns {Void} null
 */
Accounts.addPhone = function(userId, newPhone, verified) {
	verified = typeof verified === 'undefined' ? false : verified;

	check(userId, String);
	check(newPhone, String);
	check(verified, Boolean);

	const user = Meteor.users.findOne(userId);
	if (!user) throw new Meteor.Error(403, 'User not found');

	newPhone = Accounts.sanitizePhone(newPhone);
	if (!newPhone) throw new Meteor.Error(500, 'Invalid phone number');
	if (Meteor.users.findOne({'phones.number': phone})) throw new Meteor.Error(500, 'User exists with given phone number');
	Meteor.users.update({_id: user._id}, {$addToSet: {phones: {number: newPhone, verified}}});
};

/**
 * @summary Remove an phone number for a user. Use this instead of updating
 * the database directly.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} phone The phone number to remove.
 * @returns {Void} null
 */
Accounts.removePhone = function(userId, phone) {
	check(userId, String);
	check(phone, String);

	const user = Meteor.users.findOne(userId);
	if (!user) throw new Meteor.Error(403, 'User not found');

	phone = Accounts.sanitizePhone(phone);
	if (!phone) throw new Meteor.Error(500, 'Invalid phone number');
	Meteor.users.update({_id: user._id}, {$pull: {phones: {number: phone}}});
};

///
/// CREATING USERS
///

// Shared createUser function called from the createUser method, both
// if originates in client or server code. Calls user provided hooks,
// does the actual user insertion.
//
// returns the user id
const createUser = function(options) {
	// Unknown keys allowed, because a onCreateUserHook can take arbitrary
	// options.
	check(options, {phone: String});

	const {phone} = options;
	const user = {username: phone, services: {phone: {number: phone}}, phones: [{number: phone, verified: true}]};

	const userId = Accounts.insertUserDoc({phone: phone}, user);
	if (!userId) throw new Meteor.Error(500, 'Failed to insert new user');

	// Perform another check after insert, in case a matching user has been
	// inserted in the meantime
	if (Meteor.users.findOne({_id: {$ne: userId}, 'phones.number': phone})) {
		// Remove inserted user if the check fails
		Meteor.users.remove(userId);
		throw new Meteor.Error(500, 'User exists with given phone number');
	}
	return userId;
};

///
/// PASSWORD-SPECIFIC INDEXES ON USERS
///
// Meteor.users._ensureIndex('phones.number', {unique: 1, sparse: 1});

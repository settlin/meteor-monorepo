Accounts-Phone
=========================

Phone and OTP based login for Meteor.

## Installation

In a Meteor app directory, enter:

```
$ meteor npm install --save libphonenumber-js
$ meteor add settlin:accounts-phone
```
`libphonenumber-js` is used by `Accounts.sanitizePhone()`. I do not include it as a dependency so that if one overwrites the sanitizePhone function, the library is not added in vain.

## The database

In accordance with the current `emails` field used by `accounts-password`, we use `phones` field in the user document: `{phones: [{number, verified: false}]}`. The otp is stored in `services.phone.otp`.

## The flow

Use a simple Meteor method,
```js
function sendOtpViaSms(otp) {.....} // the function through which you send sms

Meteor.methods({
	sendOtpForLogin: function(to) {
		if (Meteor.isClient) return null;

		// otp must be generated on the server and never revealed to the client
		check(to, String);

		let user = Meteor.users.findOne({'phones.number': to});

		// if there is no user with the given phone number, we create a new one.
		// Accounts.createUser is available only on the server and creates a new user with two fields: `phones` and `services`. It ensures that the phone numbers are always unique for users.
		if (!user) user = {_id: Accounts.createUserWithPhone({phone: to})};

		// send otp as sms
		let otp = Math.round(Random.fraction() * 100000);

		// Accounts.setPhoneOtp sets the otp in the `__otps` collection: {phone, otp, purpose: '__login__'}.
		Accounts.setPhoneOtp(user._id, otp);
	},
});
```

Use this method to send otp whenever needed. Next, take the otp from the user and call,
```
Meteor.loginWithPhone({phone, otp}, callback);
```
This method works as any other `Meteor.loginWith<Service>` method.

## Simple API

### Server
```js
Meteor.otps; // the collection that contains otps in the form {phone, otp, purpose, createdAt} with an index created by: Meteor.otps._ensureIndex({phone: 1, purpose: 1}, {unique: true, name: 'phoneAndPurpose'});
// not available on client

/**
 * @summary Set the otp for a user.
 * @locus Server
 * @param {String} userId The id of the user to update.
 * @param {String} otp OTP
 * @returns {Void} null
 */
Accounts.setPhoneOtp = function(userId, otp) {...};

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
Accounts.addPhone = function(userId, newPhone, verified) {...};

/**
 * @summary Remove an phone number for a user. Use this instead of updating
 * the database directly.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} phone The phone number to remove.
 * @returns {Void} null
 */
Accounts.removePhone = function(userId, phone) {...};

/**
 * @summary Create a user directly on the server. Unlike the client version, this does not log you in as this user after creation.
 * @locus Server
 * @param {Object} options Object with arguments. Needs just {phone: String} for now.
 * @returns {String} userId The newly created user's _id
 */
Accounts.createUserWithPhone = function(options) {...};

/**
 * @summary finds user by doing a phone number search. Throws error if multiple found.
 * @param {String} phone phone number.
 * @return {Object} user document
 */
Accounts.findUserByPhone = function(phone) {...};

/**
 * @summary Log the user in with a password. Indian phone numbers are accepted without 91. For others, the country code is required. Uses https://github.com/halt-hammerzeit/libphonenumber-js
 * @locus Server
 * @param {String}  phone phone number
 * @return {String} sanitized phone number. Tweaked for Indian numbers, but works for other countries as well.
 */
Accounts.sanitizePhone = function(phone) {...};
```

### Client

```js
/**
 * @summary Log the user in with a password.
 * @locus Client
 * @param {Object} options phone and otp
 * @param {Function} [callback] Optional callback. Called with no arguments on success,
 *      or with a single `Error` argument on failure.
 * @return {Void} null
 */
Meteor.loginWithPhone = function(options, callback) {...};

/**
 * @summary Log the user in with a password. Indian phone numbers are accepted without 91. For others, the country code is required. Uses https://github.com/halt-hammerzeit/libphonenumber-js, as dynamic import
 * @locus Server
 * @param {String}  phone phone number
 * @return {String} sanitized phone number. Tweaked for Indian numbers, but works for other countries as well.
 */
Accounts.sanitizePhone = async function(phone) {...};
```

If you need a phone + password login, use https://github.com/okland/accounts-phone.

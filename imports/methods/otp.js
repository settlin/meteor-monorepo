import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

Meteor.methods({
	'otp.create'({phone, purpose}) {
		if (Meteor.isClient) return null;
		check([phone, purpose], [String]);

		const otp = '12345';
		const vars = {otp};

		phone = Accounts.sanitizePhone(phone);
		if (!phone) throw new Meteor.Error('bad-phone', 'Phone number is not Indian');

		console.info('The OTP is 12345'); //eslint-disable-line no-console
		if (purpose === 'login') Accounts.setPhoneOtp(phone, otp);
		else {
			Meteor.otps.remove({phone, purpose});
			new Otp({phone, otp, purpose}).save();
		}
		return vars;
	},
});

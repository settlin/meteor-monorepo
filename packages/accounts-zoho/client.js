import {Meteor} from 'meteor/meteor';
import {Random} from 'meteor/random';
import {OAuth} from 'meteor/oauth';
import {Accounts} from 'meteor/accounts-base';
import {ServiceConfiguration} from 'meteor/service-configuration';

Accounts.oauth.registerService('zoho');

const requestCredential = (options, credentialRequestCompleteCallback) => {
	// support both (options, callback) and (callback).
	if (!credentialRequestCompleteCallback && typeof options === 'function') {
		credentialRequestCompleteCallback = options;
		options = {};
	}

	const serviceConfig = ServiceConfiguration.configurations.findOne({service: 'zoho'});
	if (!serviceConfig || !serviceConfig.authUrl) {
		credentialRequestCompleteCallback && credentialRequestCompleteCallback(new ServiceConfiguration.ConfigError());
		return;
	}

	const credentialToken = Random.secret();
	const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
	const display = mobile ? 'touch' : 'popup';

	let scope = [
		'email', 
		'profile', 
		'ZohoMail.accounts.read',
		...((options||{}).scope || [])
	];

	if (options && options.requestPermissions) {
		scope = scope.concat(options.requestPermissions);
	}
	const flatScope = scope.map(encodeURIComponent).join('+');
	const loginStyle = OAuth._loginStyle('zoho', serviceConfig, options);
	const authUrl = serviceConfig.authUrl;
	const redirectUrl = Meteor.absoluteUrl(serviceConfig.redirectUrl);
	const state = OAuth._stateParam(loginStyle, credentialToken, options && options.redirectUrl);

	const loginUrl =
    `${authUrl}` +
    '?response_type=code' +
    `&client_id=${serviceConfig.clientId}` +
    `&scope=${flatScope}` +
    `&redirect_uri=${redirectUrl}` +
		'&access_type=offline' + // to get the refresh token
		'&prompt=consent' + //required to get refresh token & it always ask for the consent
    `&display=${display}` +
    `&state=${state}`;

	OAuth.launchLogin({
		loginService: 'zoho',
		loginStyle,
		loginUrl,
		credentialRequestCompleteCallback,
		credentialToken,
		popupOptions: {height: 600},
	});
};


const loginWithZoho = (options, callback) => {
	// support a callback without options
	if (! callback && typeof options === 'function') {
		callback = options;
		options = null;
	}

	const credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
	requestCredential(options, credentialRequestCompleteCallback);
};

Accounts.registerClientLoginFunction('zoho', loginWithZoho);
Meteor.loginWithZoho = (...args) => Accounts.applyLoginFunction('zoho', args);

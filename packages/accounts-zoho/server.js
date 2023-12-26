import {Meteor} from 'meteor/meteor';
import {OAuth} from 'meteor/oauth';
import {Accounts} from 'meteor/accounts-base';
import {ServiceConfiguration} from 'meteor/service-configuration';

Accounts.oauth.registerService('zoho');

function parseJwt(token) { return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()); }

const whitelistedFields = ['id', 'email', 'verifiedEmail', 'name', 'firstName', 'lastName', 'picture', 'gender'];

const getServiceDataFromTokens = (tokens, query) => {
	//data received from authorization call
	const {
		code,
		location,
		'accounts-server': accountsServer,
	} = query;

	//data received from token call with authorization code
	const {
		access_token: accessToken,
		refresh_token: refreshToken,
		id_token: idToken,
		api_domain: apiDomain,
		token_type: tokenType,
		expires_in: expiresIn,
		accountId
	} = tokens;

	const sealedToken = OAuth.sealSecret(accessToken);

	//parsing the idToken to get data requested in the scope
	const idTokenDetails = parseJwt(idToken);

	//data received after parsing the idToken
	const {
		at_hash: atHash,
		email,
		email_verified: verifiedEmail,
		first_name: firstName,
		last_name: lastName,
		...rest
	} = idTokenDetails;

	const serviceData = {id: email, code, accessToken: sealedToken, idToken, apiDomain, tokenType, email, verifiedEmail, firstName, lastName, atHash, location, accountsServer, accountId, ...rest};

	if (refreshToken) serviceData.refreshToken = refreshToken;
	if (expiresIn) serviceData.expiresAt = Date.now() + 1000 * parseInt(expiresIn, 10);
	return {serviceData};
};

const getAccessToken = async(query, callback) => {
	const config = ServiceConfiguration.configurations.findOne({service: 'zoho'});
	if (!config) throw new ServiceConfiguration.ConfigError();

	const {fetch, Headers} = require('meteor/fetch');

	const params = {
		code: query.code,
		client_id: config.clientId,
		client_secret: OAuth.openSecret(config.secret),
		redirect_uri: OAuth._redirectUri('zoho', config),
		state: query.state,
		grant_type: 'authorization_code',
	};

	let options = {
		method: 'post',
		body: new URLSearchParams(params),
	};

	const response = await fetch(config.accessTokenUrl, options);
	let res = await response.json();

	if (res.error) {
		callback(res.error);
		throw new Meteor.Error(response.status, `Failed to complete OAuth handshake with zoho. ${res.error}`, {response: res, options, query});
	}
	
	const {data} = await (
		await fetch(`http://mail.zoho.com/api/accounts`,
		{
			headers: new Headers({
				Authorization: `Bearer ${res.access_token}`,
			}),
		}
	)).json();

	if (data.errorCode) {
		callback(data.moreInfo);
		throw new Meteor.Error(response.status, `Failed to complete OAuth handshake with zoho. ${data.errorCode}`, {response: data, options, query});
	}
	res = {...res, accountId: data[0].accountId}

	// eslint-disable-next-line no-undefined
	callback(undefined, res);
	return res;
};

const getTokensCall = Meteor.wrapAsync(getAccessToken);
const getServiceData = query => getServiceDataFromTokens(getTokensCall(query), query);

OAuth.registerService('zoho', 2, null, getServiceData);

Accounts.addAutopublishFields({
	forLoggedInUser:
	whitelistedFields.map(subfield => `services.zoho.${subfield}`), // don't publish refresh token

	forOtherUsers:
    whitelistedFields.filter(field => !['email', 'verifiedEmail', 'id'].includes(field)).map(subfield => `services.zoho.${subfield}`),
});
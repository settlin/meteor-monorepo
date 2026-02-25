import {Meteor} from 'meteor/meteor';
import {OAuth} from 'meteor/oauth';
import {Accounts} from 'meteor/accounts-base';
import {ServiceConfiguration} from 'meteor/service-configuration';

Accounts.oauth.registerService('zoho');

function parseJwt(token) { return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()); }

const whitelistedFields = ['id', 'email', 'verifiedEmail', 'name', 'firstName', 'lastName', 'picture', 'gender'];

const FETCH_TIMEOUT_MS = 15000; // 15 second timeout for all fetch calls

const fetchWithTimeout = async (url, options, ms, fetchFn = global.fetch || require('meteor/fetch').fetch) => {
	let timer;
	const timeoutPromise = new Promise((_, reject) => {
		timer = setTimeout(() => {
			const err = new Error('AbortError');
			err.name = 'AbortError';
			reject(err);
		}, ms);
	});
	return Promise.race([
		fetchFn(url, options),
		timeoutPromise
	]).finally(() => clearTimeout(timer));
};

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

	if (refreshToken) serviceData.refreshToken = OAuth.sealSecret(refreshToken);
	if (expiresIn) serviceData.expiresAt = Date.now() + 1000 * parseInt(expiresIn, 10);
	return {serviceData};
};

const getAccessToken = async(query, callback) => {
	try {
		const config = ServiceConfiguration.configurations.findOne({service: 'zoho'});
		if (!config) {
			return callback(new ServiceConfiguration.ConfigError());
		}

		const {fetch, Headers} = require('meteor/fetch');

		const params = {
			code: query.code,
			client_id: config.clientId,
			client_secret: OAuth.openSecret(config.secret),
			redirect_uri: OAuth._redirectUri('zoho', config),
			state: query.state,
			grant_type: 'authorization_code',
		};

		const options = {
			method: 'post',
			body: new URLSearchParams(params),
		};

		// Token exchange request — with timeout
		let response;
		try {
			response = await fetchWithTimeout(config.accessTokenUrl, {...options}, FETCH_TIMEOUT_MS, fetch);
		} catch (err) {
			const msg = err.name === 'AbortError'
				? `Zoho token exchange timed out after ${FETCH_TIMEOUT_MS}ms`
				: `Zoho token exchange failed: ${err.message}`;
			return callback(new Meteor.Error('zoho-token-error', msg));
		}

		let res;
		try {
			res = await response.json();
		} catch (err) {
			return callback(new Meteor.Error('zoho-token-error', `Failed to parse Zoho token response: ${err.message}`));
		}

		if (res.error) {
			return callback(new Meteor.Error(response.status, `Failed to complete OAuth handshake with zoho. ${res.error}`));
		}

		// Mail accounts request — use accounts-server domain from OAuth callback, fallback to zoho.com
		// This call is for fetching the accountId; if it fails, we still complete OAuth successfully
		const accountsServerDomain = (query['accounts-server'] || 'https://accounts.zoho.com').replace('accounts.zoho', 'mail.zoho');
		const mailApiUrl = `${accountsServerDomain}/api/accounts`;

		try {
			const mailResponse = await fetchWithTimeout(mailApiUrl, {
				headers: new Headers({
					Authorization: `Bearer ${res.access_token}`,
				}),
			}, FETCH_TIMEOUT_MS, fetch);

			const mailResult = await mailResponse.json();
			if (mailResult.data && !mailResult.data.errorCode && Array.isArray(mailResult.data) && mailResult.data[0]?.accountId) {
				res = {...res, accountId: mailResult.data[0].accountId};
			}
		} catch (err) {
			// Log but don't fail — the mail accounts call is non-essential for OAuth
			console.warn(`[accounts-zoho] Mail accounts API call failed (non-fatal): ${err.message}`);
		}

		return callback(null, res);
	} catch (err) {
		// Catch-all for any unexpected errors
		console.error('[accounts-zoho] Unexpected error in getAccessToken:', err);
		return callback(err instanceof Meteor.Error ? err : new Meteor.Error('zoho-oauth-error', `Unexpected error during Zoho OAuth: ${err.message}`));
	}
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

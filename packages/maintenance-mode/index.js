import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { WebApp } from 'meteor/webapp';

let _subHandle = null, _authToken, _allowedUsers = [];
const Maintenance = {
	options: {
		appId: 'maintenance',
		collection: 'settings',
		exposedVariable: 'Maintenance',
	},
	initialize(params) {
		params = params || {};
		_authToken = params.authToken; // only present inside this file
		_allowedUsers = params.allowedUsers || []; // only present inside this file
		delete params.authToken;
		delete params.allowedUsers;
		this.options = {...this.options, ...params};

		// allowedUsers may be defined only on server or Meteor.settings.private
		// no error on client
		// eslint-disable-next-line no-console
		if (!_allowedUsers.length && Meteor.isServer) console.error('no-allowed-user', 'Please allow at least one user to update maintenance status');

		this._collection = this.options.collection instanceof Mongo.Collection ? this.options.collection : new Mongo.Collection(this.options.collection);
		if (Meteor.isServer) this._initialize();
		if (Meteor.isClient) {
			_subHandle = Meteor.subscribe('settlinMeteorMaintenanceModeCollection');
			window[this.options.exposedVariable] = this;
		}
	},
	enable() {
		this._collection.update({_id: this.options.appId}, {$set: {enabled: true}});
	},
	disable() {
		this._collection.update({_id: this.options.appId}, {$set: {enabled: false}});
	},
	status() {
		if (!_subHandle || !_subHandle.ready()) return null;
		let doc = this._collection.findOne({_id: this.options.appId});
		if (!doc) {
			doc = this._collection.findOne();
			// eslint-disable-next-line no-console
			if (!doc) return console.error('Subscription has failed somehow. Kindly raise an issue on github https://github.com/settlin/meteor-maintenance-mode/issues/new');
			// eslint-disable-next-line no-console
			return console.error('I think you have not supplied proper appId for the client. Server appId is "' + doc._id + '", but client appId is "' + this.options.appId + '"');
		}
		return doc.enabled;
	},

	// just a private method
	_initialize() {
		if (Meteor.isClient) return;

		this._collection.allow({
			update(userId) { return !!~_allowedUsers.indexOf(userId);	}
		});
		if (!this._collection.findOne({_id: this.options.appId})) this._collection.insert({_id: this.options.appId, enabled: false});

		// create API endpoint
		let _maintenanceFunc = Meteor.bindEnvironment((action) => this[action]());
		WebApp.connectHandlers.use('/maintenance', function(req, res) {
			let action = req.url.substr(1);
			if (!~['enable', 'disable'].indexOf(action)) {
				res.writeHead(404);
				res.end('Not Found');
				return;
			}
			if (!_authToken) {
				res.writeHead(501);
				res.end('Not Implemented');
				return;
			}

			if (req.method !== 'POST') {
				res.writeHead(405, {'Content-Type': 'text/plain'});
				res.end();
				return;
			}

			if (req.body && req.body.authToken === _authToken) {
				_maintenanceFunc(action);
				res.writeHead(200);
				res.end('OK');
				return;
			}

			// if req.body is not there, it would be a stream
			var jsonString = '';
			req.on('data', function(data) {
				jsonString += data;
				// Too much POST data, kill the connection, 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
				if (jsonString.length > 1e6) req.connection.destroy();
			});

			req.on('end', function() {
				let json = {authToken: ''};
				try {
					json.authToken = jsonString.replace('authToken=', '');
				}
				catch (e) {
					console.error(e); // eslint-disable-line no-console
					res.writeHead(401);
					res.end(e.toString());
					return;
				}
				if (json.authToken !== _authToken) {
					res.writeHead(401);
					res.end('Not Authorized');
					return;
				}
				_maintenanceFunc(action);
				res.writeHead(200);
				res.end('OK');
			});
		});
	}
};

if (Meteor.isServer) {
	Meteor.publish('settlinMeteorMaintenanceModeCollection', function() {
		return Maintenance._collection.find({_id: Maintenance.options.appId}, {fields: {enabled: 1}});
	});
}


export { Maintenance };

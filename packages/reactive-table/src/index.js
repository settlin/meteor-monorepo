import React from 'react';
import { createContainer } from 'meteor/react-meteor-data';
const ReactiveTable = {};

import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';

if (Meteor.isServer) {
	// publish function
	ReactiveTable.publish = function (publication, {publishMethod, countCursorMethod, collection, selector = {}, settings = {}, composite = false}) {
		if (!publishMethod && !collection) {
			console.log('ReactiveTable.publish: No publishMethod or collection for: ' + publication); // eslint-disable-line no-console
			return;			
		}
		if (publishMethod && typeof publishMethod !== 'function') {
			console.log('ReactiveTable.publish: publishMethod is not a function for: ' + publication); // eslint-disable-line no-console
			return;
		}
		composite = publishMethod ? composite : false;

		let metPub = composite ? Meteor.publishComposite : Meteor.publish;
		metPub('__reactive-table-' + publication, publishMethod || function({publicationId, filters = {}, options = {}}) {
			check(publicationId, String);
			check(filters, Object);
			check(options, {skip: Match.Integer, limit: Match.Integer, sort: Match.Maybe(Object)});

			if (typeof collection === 'function') collection = collection.call(this);
			if (typeof selector === 'function') selector = selector.call(this);

			if (!(collection instanceof Mongo.Collection)) {
				console.log('ReactiveTable.publish: no collection to publish for: ' + publication); // eslint-disable-line no-console
				return [];
			}

			const filterQuery = {...filters, ...selector};
			if ((settings || {}).fields) options.fields = settings.fields;

			return [
				collection.find(filterQuery, options)
			];
		});
		if (countCursorMethod && typeof countCursorMethod !== 'function') {
			console.log('ReactiveTable.publish: countCursorMethod is not a function for: ' + publication); // eslint-disable-line no-console
			return;
		}

		Meteor.publish('__reactive-table-count-' + publication, function({publicationId, filters = {}, options = {}}) {
			if (typeof collection === 'function') collection = collection.call(this);
			if (!countCursorMethod && !(collection instanceof Mongo.Collection)) {
				console.log('ReactiveTable.publishCount: no collection to publish for: ' + publication); // eslint-disable-line no-console
				return [];
			}
			if (countCursorMethod) {
				let cursor = countCursorMethod(filters);
				return cursor || [];
			}
			return new Counter('count-' + publication + '-' + publicationId, collection.find(filters, {fields: {_id: 1}}));
		});
	};
}

// Table components
class Table extends React.PureComponent {
	render() {
		return <div>{this.props.children}</div>;
	}
}
let TableContainer;
let _pubs = {};
if (Meteor.isClient) {
	TableContainer = createContainer(({publication, collection, filters = {}, page = 1, rowsPerPage = 10, sort = {}, onDataChange, manual}) => {
		if (!_pubs[publication]) {
			_pubs[publication] = {publicationId: Math.round(Math.random() * 10000000000) + ''}; // 10 digits
			_pubs[publication].name = manual ? publication : 'reactive-table-rows-' + publication + '-' + _pubs[publication].publicationId;
			_pubs[publication].collection = collection;
		}
		let options = { limit: rowsPerPage, skip: rowsPerPage * (page - 1), sort };
		_pubs[publication].subscription = Meteor.subscribe('__reactive-table-' + publication, {publicationId: _pubs[publication].publicationId, filters, options});
		Meteor.subscribe('__reactive-table-count-' + publication, {publicationId: _pubs[publication].publicationId, filters});
		if (onDataChange) {
			if (!_pubs[publication].subscription.ready()) onDataChange({data: [], loading: true});
			else {
				onDataChange({
					loading: false,
					data: _pubs[publication].collection ? _pubs[publication].collection.find(filters, options).fetch() : [],
					pages: Math.ceil(Counter.get('count-' + publication + '-' + _pubs[publication].publicationId) / rowsPerPage)
				});
			}
		}
		return {};
	}, Table);
}

ReactiveTable.Component = TableContainer;

export { ReactiveTable };

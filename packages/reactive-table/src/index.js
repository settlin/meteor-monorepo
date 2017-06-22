import React from 'react';
import { createContainer } from 'meteor/react-meteor-data';
const ReactiveTable = {};

import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';

class Table extends React.PureComponent {
	render() {
		return <div>{this.props.children}</div>;
	}
}

let TableContainer;
let _pubs = {};
if (Meteor.isClient) {
	TableContainer = createContainer(({publication, collection, filters, page, rowsPerPage, sort, onDataChange}) => {
		if (!_pubs[publication]) {
			_pubs[publication] = {publicationId: Math.round(Math.random() * 10000000000) + ''}; // 10 digits
			_pubs[publication].name = 'reactive-table-rows-' + publication + '-' + _pubs[publication].publicationId;
			_pubs[publication].collection = collection;
		}
		_pubs[publication].subscription = Meteor.subscribe('__reactive-table-' + publication, {publicationId: _pubs[publication].publicationId, filters, options: {limit: rowsPerPage, skip: rowsPerPage * (page - 1),  sort}});
		if (onDataChange) {
			if (!_pubs[publication].subscription.ready()) onDataChange({data: [], loading: true});
			else {
				onDataChange({
					loading: _pubs[publication].subscription.ready(),
					data: _pubs[publication].collection.find().fetch(),
					pages: Math.ceil(Counter.get('count-' + publication + '-' + _pubs[publication].publicationId) / rowsPerPage)
				});
			}
		}
		return {};
	}, Table);
}
else TableContainer = Table;

class TableWrapper extends React.PureComponent {
	render() {
		return <TableContainer {...this.props}/>;
	}
}
TableWrapper.propTypes = {
	filters: PropTypes.object,
	sort: PropTypes.object,
	page: PropTypes.number,
	rowsPerPage: PropTypes.number,
};
TableWrapper.defaultProps = {
	page: 1,
	rowsPerPage: 10,
	sort: {},
};

ReactiveTable.Component = TableWrapper;

ReactiveTable.publish = function(publication, collection, selector = {}, settings = {}) {
	Meteor.publish('__reactive-table-' + publication, function({publicationId, filters = {}, options = {}}) {
		check(publicationId, String);
		check(filters, Object);
		check(options, {skip: Match.Integer, limit: Match.Integer, sort: Object});

		if (typeof collection === 'function') collection = collection.call(this);
		if (typeof selector === 'function') selector = selector.call(this);

		if (!(collection instanceof Mongo.Collection)) {
			console.log('ReactiveTable.publish: no collection to publish'); // eslint-disable-line no-console
			return [];
		}

		const filterQuery = {...filters, ...selector};
		if ((settings || {}).fields) options.fields = settings.fields;

		return [
			new Counter('count-' + publication + '-' + publicationId, collection.find(filterQuery, {fields: {_id: 1}})),
			collection.find(filterQuery, options)
		];
	});
};

export { ReactiveTable };

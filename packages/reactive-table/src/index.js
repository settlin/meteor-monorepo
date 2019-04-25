import { Meteor } from 'meteor/meteor';

// If you are using the dependency in the same file, you'll need to use require, otherwise
// you can continue to `import` in another file.
const React = require('react');
import { withTracker } from 'meteor/react-meteor-data';
const ReactiveTable = {};


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
				if (!cursor) return [];
				return new Counter('count-' + publication + '-' + publicationId, cursor);
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
	let prevLoading = false, prevCount, prevData, prevPages;
	TableWithTracker = withTracker(({publication, pubId, collection, filters = {}, page = 1, rowsPerPage = 10, sort = {}, onDataChange, manual}) => {
		if (!_pubs[pubId]) {
			_pubs[pubId] = {};
			_pubs[pubId].name = manual ? publication : 'reactive-table-rows-' + publication + '-' + pubId;
			_pubs[pubId].collection = collection;
		}
		if (isNaN(page)) page = 1;
		const options = {limit: rowsPerPage, skip: Math.min(0, rowsPerPage * (page - 1)), sort};
		const clientOptions = {sort};
		_pubs[pubId].subscription = [
			Meteor.subscribe('__reactive-table-' + publication, {publicationId: pubId, filters, options}),
			Meteor.subscribe('__reactive-table-count-' + publication, {publicationId: pubId, filters}),
		];
		if (onDataChange) {
			const loading = _pubs[pubId].subscription.some(handle => !handle.ready());
			const count = Counter.get('count-' + publication + '-' + pubId);
			const data = _pubs[pubId].collection ? _pubs[pubId].collection.find(filters, clientOptions).fetch() : [];
			const pages = Math.ceil(count / rowsPerPage);

			if (JSON.stringify(prevData) === JSON.stringify(data) && JSON.stringify(prevCount) === JSON.stringify(count) && JSON.stringify(prevPages) === JSON.stringify(pages)) return {};

			prevLoading = loading;
			prevCount = count;
			prevData = data;
			prevPages = pages;
			onDataChange({loading: false, data, count, pages});
		}
		return {};
	})(Table);

	class TableContainerClass extends React.PureComponent {
		constructor(props) {
			super(props);
			this._publicationId = Math.round(Math.random() * 10000000000) + ''; // 10 digits
		}
		render() {
			return <TableWithTracker {...this.props} pubId={this._publicationId}/>;
		}
	}
	TableContainer = TableContainerClass;
}

ReactiveTable.Component = TableContainer;

export { ReactiveTable };

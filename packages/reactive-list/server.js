import {Meteor} from 'meteor/meteor';

// If you are using the dependency in the same file, you'll need to use require, otherwise
// you can continue to `import` in another file.

// publish function
export default function (publication, {publishMethod, cursorMethod, countCursorMethod, countMeteorMethod, collection, selector = {}, settings = {}, composite = false}) {
	if (!publishMethod && !collection) {
		console.log('ReactiveList.publish: No publishMethod or collection for: ' + publication); // eslint-disable-line no-console
		return;			
	}
	if (publishMethod && typeof publishMethod !== 'function') {
		console.log('ReactiveList.publish: publishMethod is not a function for: ' + publication); // eslint-disable-line no-console
		return;
	}
	composite = publishMethod ? composite : false;

	let metPub = composite ? Meteor.publishComposite : Meteor.publish;
	metPub('__reactive-list-' + publication, function({publicationId, filters = {}, options = {}}) {
		check(publicationId, String);
		check(filters, Object);
		check(options, {skip: Match.Integer, limit: Match.Integer, sort: Match.Maybe(Object)});

		if (typeof collection === 'function') collection = collection.call(this);
		if (typeof selector === 'function') selector = selector.call(this);

		const filterQuery = {...filters, ...selector};
		if ((settings || {}).fields) options.fields = settings.fields;

		let cursors = publishMethod({filters, options}) || [collection.find(filterQuery, options)];
		if (cursors._mongo) cursors = [cursors];
		cursors.map((c, i) => Mongo.Collection._publishCursor(c, this, publicationId + '-' + i));

		if (countCursorMethod && typeof countCursorMethod !== 'function') {
			console.log('ReactiveList.publish: countCursorMethod is not a function for: ' + publication); // eslint-disable-line no-console
		}
		else {
			if (countCursorMethod) {
				let cursor = countCursorMethod(filters);
				if (!cursor) return [];
				new Counter('count-' + publication + '-' + publicationId, cursor);
			}
			else if (collection) new Counter('count-' + publication + '-' + publicationId, collection.find(filters, {fields: {_id: 1}}));
		}

		return this.ready();
	});
};

import { Behavior } from 'meteor/jagi:astronomy';

Behavior.create({
	name: 'meta',
	options: {
		hasCreatedAtField: true,
		hasCreatedByField: true,
		hasUpdatedAtField: true,
		hasUpdatedByField: true,
		createdAtFieldName: 'createdAt',
		createdByFieldName: 'createdBy',
		updatedAtFieldName: 'updatedAt',
		updatedByFieldName: 'updatedBy'
	},
	createClassDefinition: function() {
		const definition = {
			fields: {},
			events: {
				beforeInsert: (e) => {
					var doc = e.currentTarget;
					this.setCreationDate(doc);
					this.setCreator(doc);
				},
				beforeUpdate: (e) => {
					var doc = e.currentTarget;
					this.setUpdationDate(doc);
					this.setUpdater(doc);
				}
			}
		};

		if (this.options.hasCreatedAtField) {
      // Add a field for storing a creation date.
			definition.fields[this.options.createdAtFieldName] = {
				type: Date,
				immutable: true,
				optional: true
			};
		}

		if (this.options.hasCreatedByField) {
      // Add a field for storing the creator.
			definition.fields[this.options.createdByFieldName] = {
				type: String,
				immutable: true,
				optional: true
			};
		}

		if (this.options.hasUpdatedAtField) {
      // Add a field for storing an update date.
			definition.fields[this.options.updatedAtFieldName] = {
				type: Date,
				optional: true
			};
		}

		if (this.options.hasUpdatedByField) {
      // Add a field for storing the updater.
			definition.fields[this.options.updatedByFieldName] = {
				type: String,
				optional: true
			};
		}

		return definition;
	},
	apply: function(Class) {
		Class.extend(this.createClassDefinition(), ['fields', 'events']);
	},
	setCreationDate: function(doc) {
    // Get current date.
		const date = new Date();

    // If the "hasCreatedAtField" option is set.
		if (this.options.hasCreatedAtField) {
      // Set value for created field.
			if (!doc[this.options.createdAtFieldName]) doc[this.options.createdAtFieldName] = date;
		}

		if (this.options.hasUpdatedAtField) {
      // Set value for the "updatedAt" field.
			if (!doc[this.options.updatedAtFieldName]) doc[this.options.updatedAtFieldName] = date;
		}
	},
	setCreator: function(doc) {
    // do not update the creator
		if (doc[this.options.createdByFieldName]) return;

    // Get current user.
		let user;
		try {
			user = Meteor.userId();
		}
    catch (e) {
			user = '_'; // default system user
		}

		if (this.options.hasCreatedByField) {
      // do not update if field already set and user not found
			if ((!user || user === '_') && doc[this.options.createdByFieldName]) return;
			doc[this.options.createdByFieldName] = user;
		}

		if (this.options.hasUpdatedByField) {
      // do not update if field already set and user not found
			if ((!user || user === '_') && doc[this.options.updatedByFieldName]) return;
			doc[this.options.updatedByFieldName] = user;
		}
	},
	setUpdationDate: function(doc) {
    // Get current date.
		const date = new Date();

    // If the "hasUpdatedAtField" option is set.
		if (this.options.hasUpdatedAtField) {
      // Set value for the "updatedAt" field.
			doc[this.options.updatedAtFieldName] = date;
		}
	},
	setUpdater: function(doc) {
    // Get current user.
		let user;
		try {
			user = Meteor.userId();
		}
    catch (e) {
			user = '_';
		}

		if (this.options.hasUpdatedByField) {
      // do not update if field already set and user not found
			if ((!user || user === '_') && doc[this.options.updatedByFieldName]) return;
			doc[this.options.updatedByFieldName] = user;
		}
	}
});

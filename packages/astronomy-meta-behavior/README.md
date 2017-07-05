# Meta behavior for Meteor Astronomy

The `meta` behavior adds 4 fields that store information about document's creation and update dates and users.

```
hasCreatedAtField: true,
hasCreatedByField: true,
hasUpdatedAtField: true,
hasUpdatedByField: true,
createdAtFieldName: 'createdAt',
createdByFieldName: 'createdBy',
updatedAtFieldName: 'updatedAt',
updatedByFieldName: 'updatedBy'
```

Simple Usage:
```
behaviors: {
  meta: {}
}
```

Note: If any of the fields are already present, they will not be set again.

A detailed information about behavior can be found [here](http://jagi.github.io/meteor-astronomy/v2#meta).

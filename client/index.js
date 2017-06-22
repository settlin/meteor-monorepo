import { render } from 'react-dom';
import React from 'react';
import { Table } from '/imports/examples/reactive-table';

Meteor.startup(() => {
	render(<Table/>, document.getElementById('root'));
});

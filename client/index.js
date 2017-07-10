import { render } from 'react-dom';
import React from 'react';
import { App } from '/imports/app';

Meteor.startup(() => {
	render(<App/>, document.getElementById('root'));
});

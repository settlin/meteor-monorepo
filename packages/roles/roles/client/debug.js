////////////////////////////////////////////////////////////
// Debugging helpers
//
// Run this in your browser console to turn on debugging
// for this package:
//
//   localstorage.setItem('Roles.debug', true)
//

const {Roles} = require('../common.js');

if (localStorage) {
	var temp = localStorage.getItem('Roles.debug');

	if (typeof temp !== 'undefined') {
		Roles.debug = !!temp;
	}
}

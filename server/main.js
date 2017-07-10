import { Meteor } from 'meteor/meteor';
const Individuals = new Mongo.Collection('individuals');

import { ReactiveTable } from 'meteor/settlin:reactive-table';

ReactiveTable.publish('test', Individuals);

require('/imports/methods/otp');

Meteor.startup(() => {
  // code to run on server at startup
});

// [1,2,3,4,5,6].diff( [3,4,5] );  => [1, 2, 6]
const diff = function(a, b) {
  return a.filter(function(i) {
    return b.indexOf(i) < 0;
  });
};

// [1, 2, [3, 4]].sameAs([1, 2, [3, 2]]) === false;
// attach the .sameAs method to Array's prototype to call it on any array
const sameAs = function(a, b) {
  // if the other array is a falsy value, return
  if(!a || !b) return false;

  // compare lengths - can save a lot of time
  if(a.length !== b.length) return false;

  for(let i = 0, l = a.length; i < l; i++) {
    // Check if we have nested arrays
    if(a[i] instanceof Array && b[i] instanceof Array) {
      // recurse into the nested arrays
      if(!sameAs(a[i], b[i])) return false;
    }
    else if(a[i] !== b[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
};

Mongo.Collection.prototype.vermongo = function(op) {
  const collection = this;
  //console.log('[Vermongo]', collection._name, op);
  const options = op || {};
  options.userId = options.userId || false;
  options.createdAt = options.createdAt || 'createdAt';
  options.modifiedAt = options.modifiedAt || 'modifiedAt';
  options.ignoredFields = options.ignoredFields || [];
  let offOnce = false;
  let _versions_collection = options.collectionName || null;

  // Setting hooks for a collection
  const add = function(collection) {
    const name = collection._name;

    // create a new collection if not already existing
    if (!_versions_collection) _versions_collection = new Mongo.Collection(name + '.vermongo');

    /*
     * insert hook
     * Beware that collection2 validation occurs *before* this callback
     * */
    collection.before.insert(function(userId, doc) {
      // do nothing if special option is set
      if(offOnce) {
        offOnce = false;
        return;
      }
      // add vermongo fields
      doc._version = 1;
      if(options['timestamps']) {
        const now = new Date();
        if(!doc[options.createdAt]) doc[options.createdAt] = now;
        if(!doc[options.modifiedAt]) doc[options.modifiedAt] = now;
      }

      if(!doc[options.userId] && options.userId && userId)
        doc[options.userId] = userId;

    });

    // copy Doc in vermondo collection
    const copyDoc = function(doc) {
      if(Meteor.isServer) { // avoid duplicated insertion
        // copy doc to versions collection
        const savedDoc = Object.assign({}, doc); // shallow copy
        if(typeof(savedDoc._id) !== 'undefined') delete savedDoc._id;
        savedDoc.ref = doc._id;

        _versions_collection.insert(savedDoc);
      }
    };

    /*
     * update hook
     * */
    collection.before.update(function(userId, doc, fieldNames, modifier, hook_options) {
      // do nothing if special option is set
      if(offOnce) {
        offOnce = false;
        return;
      }
      // do nothing if only ignored fields are modified
      if(sameAs(diff(fieldNames, options.ignoredFields), [])) return;

      // in case of doc not already versionned
      if(!doc._version) doc._version = 1;

      copyDoc(doc);

      // incrementing version
      modifier.$set = modifier.$set || {};
      modifier.$set._version = doc._version + 1;

      if(options['timestamps'])
        modifier.$set[options.modifiedAt] = new Date();
      if(!doc[options.userId] && options.userId && userId)
        modifier.$set[options.userId] = userId;

    });

    /*
     * remove hook
     * */
    collection.before.remove(function(userId, doc) {
      // do nothing if special option is set
      if(offOnce) {
        offOnce = false;
        return;
      }
      // in case of doc not already versioned
      if(!doc._version) doc._version = 1;

      copyDoc(doc); // put last known version in vermongo collection

      // put a dummy version with deleted flag
      doc._version = doc._version + 1;
      if(options['timestamps'])
        doc[options.modifiedAt] = new Date();
      if(!doc[options.userId] && options.userId && userId)
        doc[options.userId] = userId;
      doc._deleted = true;
      copyDoc(doc);
    });

    /*
     * collection helpers
     * */
    collection.helpers({
      versions: function() {
        return _versions_collection.find({ref: this._id}, {sort: {_version: -1}});
      }
    });

    collection.vermongoOffOnce = function() {
      offOnce = true;
    };

    return collection;
  };

  this.getVersionCollection = function() {
    return _versions_collection;
  };

  if(typeof(collection) !== 'undefined' && collection !== null)
    add(collection);

  return collection;
};

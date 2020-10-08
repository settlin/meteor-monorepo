import { Ground } from 'meteor/settlin:ground-db'

const collectionRegistry = {}
export const createCollection = (name, schema, indexes = []) => {
  if (collectionRegistry[name]) {
    return collectionRegistry[name]
  }

  const OfflineCollection = new Ground.Collection(name)
  collectionRegistry[name] = OfflineCollection

  return OfflineCollection
}

export const getCollectionByName = (name) => createCollection(name)

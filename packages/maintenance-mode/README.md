maintenance-mode
============

A simple package to enable maintenance mode for your app. For Meteor 1.3+, as it uses ecmascript, but in case you need it for older Meteor versions, it is quite easy to build.
<br />
`meteor add settlin:maintenance-mode`

<br />

<a id="roles-toc" name="roles-toc"></a>

# Table of Contents

* [Usage](#maintenance-usage)
* [Concept](#maintenance-concept)
* [API](#maintenance-api)


<br />
<a id="maintenance-usage" name="maintenance-usage"></a>

# Usage

In a startup file for both server and client, include the following

```js
import { Maintenance } from 'meteor/settlin:meteor-maintenance-mode';

let allowedUserIds = [id1, id2];
// required, so that you can login to your app, open up the console
// and fire commands to toggle the modes as per your whims and fancies
Maintenance.initialize({collection: 'settings', allowedUsers: allowedUserIds});

// optional line
// generally the maintenance mode is useful while deploying new versions of an app
// hence it makes sense to reset the maintenance mode on new deployment, i.e. startup.
Meteor.startup(function() { Maintenance.disable(); });
```

There is also an API end-point: `/maintenance/<action>`. Available actions are: `enable` and `disable`. You need to do a POST request with an `authToken` as data. eg.

```bash
curl --data '{"authToken": "12345"}' http://localhost:3500/maintenance/disable
```

This can be used in your deployment scripts to ensure that the users are alerted to maintenanceModes automatically.

<br />
<a id="maintenance-concept" name="maintenance-concept"></a>

# Concept

1. Use a collection to have a single document `{_id: 'maintenance', enabled: false}`
2. Subscribe to this collection
3. Whenever this `<exposedVariable>.status()` (a reactive function, as it uses `findOne`) becomes `true`, modify client accordingly (this is not done by the package, has to be done by the user).
- You can render a different component/template on the same route (My preferred way).
- You can redirect the route to some maintenance.html
- Anything else that you want - Show notification messages, logout users, stop updates...
4. Allow changes to this maintenance collection, only by certain users on client. `Maintenance` variable is exposed on the client so that one can easily call `Maintenance.enable()`
5. API-endpoint. The authtoken sent via POST, is matched with the authToken provided during `initialize`. The initial authToken is a local variable for the package, and is never exposed to the Meteor server or client.



<br />
<a id="maintenance-api" name="maintenance-api"></a>

# API

## Server (Maintenance.\<function>)

#### initialize(options)

options (all are optional)
-	allowedUsers: Arrays of user ids - Users who can change the state from the client (Default: [])
-	appId: For cases when same db is used for multiple apps, uss a different appId for each one (Default: 'maintenance')
- authToken: An authToken for REST API (Default: undefined)
-	collection: Name of the collection, or the Mongo.Collection instance itself (Default: 'settings')
- exposedVariable: Variable that is available on client as a key of the window object (Default: 'Maintenance')
}


## REST

If no authToken given during initialization, returns 501.
If POST authToken does not match, returns 401.

#### /maintenance/enable

#### /maintenance/disable



## Client (\<exposedVariable>.\<function>)

#### enable()

#### disable()

#### status()

Returns `true` or `false`.

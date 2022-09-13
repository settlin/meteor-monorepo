# Accounts-Zoho
=========================

A login service for ZOHO for Meteor app.

## Installation

In a Meteor app directory, enter:

```
meteor add settlin:accounts-zoho
```


## Define the Service Configuration

For sign in with ZOHO your app needs to define the `ServiceConfiguration` in server 


After Meteor 2.7 we can use Meteor settings for setting your services under `Meteor.settings.serviceConfig.zoho`. All the properties can be set under the service and will be added to the database as is, so make sure that they are correct. For the example:

```javascript
{
	"serviceConfig": {
		"zoho": {
		"clientId": "12345",
		"authUrl": "https://accounts.zoho.com/oauth/v2/auth",
		"accessTokenUrl": " https://accounts.zoho.com/oauth/v2/token",
		"secret": "xyz12345",
		"redirectUrl": "/_oauth/zoho"
		}
	}
}
```

```javascript
import { Meteor } from 'meteor/meteor'
import {ServiceConfiguration} from 'meteor/service-configuration';

Meteor.startup(() => {
  const { serviceConfig: {zoho} = {} } = Meteor.settings
  ServiceConfiguration.configurations.upsert(
    { service: 'zoho' },
    {
      $set: {
				//Mandotary fileds
				loginStyle: 'popup',
				clientId: zoho.clientId,
				secret: zoho.secret,
				authUrl: zoho.authUrl,
				accessTokenUrl: zoho.accessTokenUrl,
				redirectUrl: zoho.redirectUrl,
				//Optional: extra fields to be inserted in profile
        profile: [
          'firstName',
           'lastName',
        ],       
      }
    }
  )
})
```

## License

MIT, see [license file](./LICENSE)

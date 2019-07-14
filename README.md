## Kadira - Performance Monitoring for Meteor
This project is based on the [Kadira](https://github.com/lmachens/kadira) without jQuery dependency.

If you are looking for the kadira server, take a look at [meteor apm server](https://github.com/lmachens/meteor-apm-server).

### Why another one?
1) remove legacy code
2) ES6
3) Meteor 1.8.1+

### Getting started

1. Create an account in Meteor APM or Kadira
2. From the UI, create an app. You'll get an `AppId` and an `AppSecret`.
3. Run `meteor add afrokick:kadira` in your project
4. Configure your Meteor app with the `AppId` and `AppSecret` by adding the following code snippet to a `server/kadira.js` file:

```js
Meteor.startup(function() {
  Kadira.connect('<AppId>', '<AppSecret>');
});
```

Now you can deploy your application and it will send information to Kadira. Wait up to one minute and you'll see data appearing in the Kadira Dashboard.


### Auto Connect

Your app can connect to Kadira using environment variables or using [`Meteor.settings`](http://docs.meteor.com/#meteor_settings).

#### Using Meteor.settings
Use the followng `settings.json` file with your app:

```js
{
  ...
  "kadira": {
    "appId": "<appId>",
    "appSecret": "<appSecret>"
  }
  ...
}
```

The run your app with `meteor --settings=settings.json`.

#### Using Environment Variables

Export the following environment variables before running or deploying your app:

```
export KADIRA_APP_ID=<appId>
export KADIRA_APP_SECRET=<appSecret>
````

### Error Tracking

Kadira comes with built in error tracking solution for Meteor apps. It has been enabled by default.
For more information, please visit the meteor [docs](http://galaxy-guide.meteor.com/kb-error-tracking.html).

By default, Kadira tracks all the errors for you. But you may need to handle errors yourself. For those situations, you may need to report the error back to kadira as well. Here are the some of the options you can do.  

### Option 1 - Throw a new Error

Easiest option is try capture errors and handle them yourself. Then throw another error. Then kadira will capture that and you can see that error from in the UI.  

``` js
try {
  // your code which may throw some errors
} catch(ex) {
  // handle your error and throw again
  throw ex;
}
```

### Option 2 - Use Kadira.trackError

Other option is to use `Kadira.trackError` API. Which is available on both **client** and the **server**. See how it can used.  

``` js
try {
  // your code 
} catch(ex) {
  var type = 'my-error-type';
  var message = ex.message;
  Kadira.trackError(type, message);
}
```

When you are tracking custom errors, do not use following types:  

*   client
*   method
*   sub
*   server-crash
*   server-internal

We use above types to track errors automatically. If you also send errors with above types, things may not works as they used to.
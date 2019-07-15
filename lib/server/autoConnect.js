import { Meteor } from 'meteor/meteor';

Kadira._connectWithEnv = () => {
  const { KADIRA_APP_ID, KADIRA_APP_SECRET } = process.env || {};

  if (KADIRA_APP_ID && KADIRA_APP_SECRET) {
    const options = Kadira._parseEnv(process.env);

    Kadira.connect(
      KADIRA_APP_ID,
      KADIRA_APP_SECRET,
      options
    );

    Kadira.connect = () => {
      throw new Error('Kadira has been already connected using credentials from Environment Variables');
    };
  }
};


Kadira._connectWithSettings = () => {
  const { appId, appSecret, options = {} } = Meteor.settings.kadira || {};

  if (appId && appSecret) {
    Kadira.connect(
      appId,
      appSecret,
      options
    );

    Kadira.connect = () => {
      throw new Error('Kadira has been already connected using credentials from Meteor.settings');
    };
  }
};

// Try to connect automatically
Kadira._connectWithEnv();
Kadira._connectWithSettings();

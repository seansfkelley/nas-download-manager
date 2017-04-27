import { Auth, SessionName } from './api';

declare const browser: {
  storage: {
    local: {
      get: Function;
      set: Function;
    };
  }
};

interface Settings {
  host?: string;
  username?: string;
  password?: string;
}

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  'host': true,
  'username': true,
  'password': true
};

const SETTING_NAMES = Object.keys(_settingNames) as (keyof Settings)[];

function getSettingsFromDom() {
  const settings: Settings = {};

  SETTING_NAMES.forEach(name => {
    const value = (document.getElementById(name) as HTMLInputElement).value;
    if (value != null) {
      settings[name] = value;
    }
  });

  return settings;
}

function saveSettings(e: MouseEvent) {
  e.preventDefault();
  console.log('persisting settings...');

  browser.storage.local.set(getSettingsFromDom())
    .catch((error: any) => {
      console.error(error);
    });
}

function loadSettings() {
  console.log('restoring persisted settings...');
  browser.storage.local.get(SETTING_NAMES)
    .then((values: Settings) => {
      SETTING_NAMES.forEach(name => {
        const value = values[name];
        if (value != null) {
          (document.getElementById(name) as HTMLInputElement).value = value;
        }
      });
    })
    .catch((error: any) => {
      console.error(error);
    });
}

function testConnection() {
  const settings = getSettingsFromDom();

  if (!settings.host || !settings.username || !settings.password) {
    throw new Error(`settings in invalid state: cannot test connection without host/username/password all set`);
  }

  Auth.Login({
    account: settings.username,
    passwd: settings.password,
    session: SessionName.DownloadStation
  })
    .then(result => {
      console.log(result);
    })
    .catch((error: any) => {
      console.error(error);
    });
}

document.addEventListener('DOMContentLoaded', loadSettings);
(document.getElementById('options') as HTMLFormElement).addEventListener('submit', saveSettings);
(document.getElementById('test-connection') as HTMLButtonElement).addEventListener('click', testConnection);

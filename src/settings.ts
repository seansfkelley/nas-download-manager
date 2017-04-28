import { Auth, SessionName, DownloadStation, ERROR_CODES } from './api';

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
    .then(() => {
      console.log('done persisting settings');
    })
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
    .then(() => {
      console.log('done restoring settings');
    })
    .catch((error: any) => {
      console.error(error);
    });
}

const TEST_BUTTON = document.getElementById('test-connection-button') as HTMLButtonElement;
const TEST_OUTPUT = document.getElementById('test-output') as HTMLDivElement;

const DEFAULT_ERROR_MESSAGE = 'Unknown error; please check your internet connetion and hostname.';

function testConnection() {
  const settings = getSettingsFromDom();

  if (!settings.host || !settings.username || !settings.password) {
    throw new Error(`settings in invalid state: cannot test connection without host/username/password all set`);
  }

  TEST_BUTTON.disabled = true;
  TEST_OUTPUT.innerText = 'Testing connection...';
  TEST_OUTPUT.classList.remove('error');

  function displaySuccess() {
    TEST_OUTPUT.innerText = 'Success! Connection to DiskStation established.';
  }

  function displayFailure(reason?: string) {
    TEST_OUTPUT.innerText = `Failed to log in to DiskStation. ${reason || DEFAULT_ERROR_MESSAGE}`;
    TEST_OUTPUT.classList.add('error');
  }

  const host = settings.host;

  Auth.Login(host, {
    account: settings.username,
    passwd: settings.password,
    session: SessionName.DownloadStation
  })
    .then(result => {
      if (!result) {
        displayFailure();
        return Promise.resolve();
      } else if (!result.success) {
        displayFailure(ERROR_CODES.common[result.error.code] || ERROR_CODES.auth[result.error.code]);
        return Promise.resolve();
      } else {
        return DownloadStation.Info.GetConfig(host, result.data.sid)
          .then(result => {
            if (!result) {
              displayFailure();
            } else if (!result.success) {
              displayFailure(ERROR_CODES.common[result.error.code] || ERROR_CODES.task[result.error.code]);
            } else {
              displaySuccess();
            }
          })
      }
    })
    .catch((error?: any) => {
      console.error(error || 'Unknown error!');
      displayFailure((error && error.message) || error);
    })
    .then(() => {
      TEST_BUTTON.disabled = false;
    });
}

document.addEventListener('DOMContentLoaded', loadSettings);
(document.getElementById('options') as HTMLFormElement).addEventListener('submit', saveSettings);
TEST_BUTTON.addEventListener('click', testConnection);

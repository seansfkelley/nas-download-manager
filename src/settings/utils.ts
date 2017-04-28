import { Auth, SessionName, DownloadStation, ERROR_CODES, LEGAL_HOST_SUFFIXES, AUTH_BAD_CREDENTIALS_CODE } from '../api';

declare const browser: {
  storage: {
    local: {
      get: <T>(input: string | string[]) => Promise<T>;
      set: <T>(input: T) => Promise<void>;
    };
  }
};

export interface Settings {
  host: string;
  username: string;
  password: string;
}

export const EMPTY_SETTINGS: Settings = {
  host: '',
  username: '',
  password: ''
};

const HOSTNAME_REGEX = new RegExp(`^https?://.+\\.(${LEGAL_HOST_SUFFIXES.join('|').replace('.', '\\.')}):\\d+$`);

export function isValidHost(host: string) {
  return HOSTNAME_REGEX.test(host);
}

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  'host': true,
  'username': true,
  'password': true
};

export const SETTING_NAMES = Object.keys(_settingNames) as (keyof Settings)[];

export function saveSettings(settings: Settings) {
  console.log('persisting settings...');

  return browser.storage.local.set(settings)
    .then(() => {
      console.log('done persisting settings');
    })
}

export function loadSettings() {
  console.log('loading persisted settings...');
  return browser.storage.local.get<Partial<Settings>>(SETTING_NAMES)
    .then<Settings>(settings => {
      console.log('loaded persisted settings');
      return {
        ...EMPTY_SETTINGS,
        ...settings
      };
    });
}

export type ConnectionTestResult = 'good' | 'missing-values' | 'invalid-host' | 'unknown-error' | 'bad-credentials' | { failMessage: string };

export function testConnection(settings: Settings): Promise<ConnectionTestResult> {
  if (settings.host == null || settings.username == null || settings.password == null) {
    return Promise.resolve('missing-values' as 'missing-values');
  } else if (!isValidHost(settings.host)) {
    return Promise.resolve('invalid-host' as 'invalid-host');
  } else {
    function failureMessage(failMessage?: string) {
      if (failMessage) {
        return { failMessage };
      } else {
        return 'unknown-error';
      }
    }

    const host = settings.host;
    return Auth.Login(host, {
      account: settings.username,
      passwd: settings.password,
      session: SessionName.DownloadStation
    })
      .then(result => {
        if (!result) {
          return 'unknown-error';
        } else if (!result.success) {
          if (result.error.code === AUTH_BAD_CREDENTIALS_CODE) {
            return 'bad-credentials';
          } else {
            return failureMessage(ERROR_CODES.common[result.error.code] || ERROR_CODES.auth[result.error.code]);
          }
        } else {
          return DownloadStation.Info.GetConfig(host, result.data.sid)
            .then(result => {
              if (!result) {
                return 'unknown-error';
              } else if (!result.success) {
                return failureMessage(ERROR_CODES.common[result.error.code] || ERROR_CODES.auth[result.error.code]);
              } else {
                return 'good';
              }
            })
        }
      })
      .catch((error?: any) => {
        console.error(error || 'Unknown error!');
        return 'unknown-error';
      });
  }
}

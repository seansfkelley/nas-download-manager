import { Auth, SessionName, ERROR_CODES, SYNOLOGY_HOST_DOMAINS } from '../api';

declare const browser: {
  storage: {
    local: {
      get: <T>(input: string | string[]) => Promise<T>;
      set: <T>(input: T) => Promise<void>;
    };
  }
};

export type Protocol = 'http' | 'https';

const _protocolNames: Record<Protocol, true> = {
  'http': true,
  'https': true
};

export const PROTOCOLS = Object.keys(_protocolNames) as Protocol[];

export interface ConnectionSettings {
  protocol: Protocol;
  hostname: string;
  domain: string;
  port: number;
  username: string;
  password: string;
}

export interface VisibleTaskSettings {
  downloading: boolean;
  uploading: boolean;
  completed: boolean;
  errored: boolean;
  other: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  pollingInterval: number;
}

export interface Settings {
  connection: ConnectionSettings;
  visibleTasks: VisibleTaskSettings;
  notifications: NotificationSettings;
}

export const SESSION_ID_KEY = 'sid';

export const DEFAULT_SETTINGS: Settings = {
  connection: {
    protocol: 'https',
    hostname: '',
    domain: SYNOLOGY_HOST_DOMAINS[0],
    port: 5001,
    username: '',
    password: '',
  },
  visibleTasks: {
    downloading: true,
    uploading: true,
    completed: false,
    errored: true,
    other: true
  },
  notifications: {
    enabled: false,
    pollingInterval: 60
  }
};

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  'connection': true,
  'visibleTasks': true,
  'notifications': true
};

export const SETTING_NAMES = Object.keys(_settingNames) as (keyof Settings)[];

function getHostUrl(settings: Settings) {
  return `${settings.connection.protocol}://${settings.connection.hostname}.${settings.connection.domain}:${settings.connection.port}`;
}

export function saveSettings(settings: Settings) {
  console.log('persisting settings...');

  return Auth.Login(getHostUrl(settings), {
    account: settings.connection.username,
    passwd: settings.connection.password,
    session: SessionName.DownloadStation
  })
    .then(result => {
      if (result.success) {
        return browser.storage.local.set({
          ...settings,
          [SESSION_ID_KEY]: result.data.sid
        });
      } else {
        throw new Error(ERROR_CODES.common[result.error.code] || ERROR_CODES.auth[result.error.code]);
      }
    })
    .then(() => {
      console.log('done persisting settings');
    });
}

export function loadSettings() {
  console.log('loading persisted settings...');
  return browser.storage.local.get<Partial<Settings>>(SETTING_NAMES)
    .then<Settings>(settings => {
      console.log('loaded persisted settings');
      return {
        ...DEFAULT_SETTINGS,
        ...settings
      };
    });
}

export type ConnectionTestResult = 'good' | 'bad-request' | 'network-error' | 'unknown-error' | { failMessage: string };

export function testConnection(settings: Settings): Promise<ConnectionTestResult> {
  function failureMessage(failMessage?: string) {
    if (failMessage) {
      return { failMessage };
    } else {
      return 'unknown-error';
    }
  }

  const host = getHostUrl(settings);
  return Auth.Login(host, {
    account: settings.connection.username,
    passwd: settings.connection.password,
    session: SessionName.DownloadStation
  })
    .then(result => {
      if (!result) {
        return 'unknown-error';
      } else if (!result.success) {
        return failureMessage(ERROR_CODES.common[result.error.code] || ERROR_CODES.auth[result.error.code]);
      } else {
        return 'good';
      }
    })
    .catch((error?: any) => {
      if (error && error.response && error.response.status === 400) {
        return 'bad-request';
      } else if (error && error.message === 'Network Error') {
        return 'network-error';
      } else {
        console.log(error);
        return 'unknown-error';
      }
    });
}

export function assertNever(n: never): never {
  throw new Error(`never assertion failed, got value ${n}`);
}

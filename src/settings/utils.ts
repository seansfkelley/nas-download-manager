import { Auth, SessionName, ERROR_CODES, SYNOLOGY_HOST_DOMAINS } from '../api';

declare const browser: {
  storage: {
    local: {
      get: <T>(input: string | string[]) => Promise<T>;
      set: <T>(input: T) => Promise<void>;
    };
  }
};

export interface ConnectionSettings {
  protocol: 'http' | 'https';
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
        ...DEFAULT_SETTINGS,
        ...settings
      };
    });
}

export type ConnectionTestResult = 'good' | 'unknown-error' | { failMessage: string };

export function testConnection(settings: Settings): Promise<ConnectionTestResult> {
  function failureMessage(failMessage?: string) {
    if (failMessage) {
      return { failMessage };
    } else {
      return 'unknown-error';
    }
  }

  const host = `${settings.connection.protocol}://${settings.connection.hostname}.${settings.connection.domain}:${settings.connection.port}`;
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
      console.error(error || 'Unknown error!');
      return 'unknown-error';
    });
}

export function assertNever(n: never): never {
  throw new Error(`never assertion failed, got value ${n}`);
}

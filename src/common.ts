import { SYNOLOGY_HOST_DOMAINS } from './api';

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

export interface StoredState extends Settings {
  sid?: string;
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

export function getHostUrl(settings: ConnectionSettings) {
  return `${settings.protocol}://${settings.hostname}.${settings.domain}:${settings.port}`;
}

export const SESSION_ID_KEY = 'sid';

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  'connection': true,
  'visibleTasks': true,
  'notifications': true
};

export const SETTING_NAMES = Object.keys(_settingNames) as (keyof Settings)[];

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

export function onStoredStateChange(fn: StorageChangeListener<StoredState>) {
  Promise.all([ loadSettings(), browser.storage.local.get<{ sid: string }>([ SESSION_ID_KEY ])])
    .then(([ settings, sid ]) => ({ ...settings, ...sid }))
    .then((storedState: StoredState) => {
      const fakedChangeEvent: StorageChangeEvent<StoredState> = {};
      Object.keys(storedState).map((key: keyof Settings) => {
        fakedChangeEvent[key] = {
          newValue: storedState[key] as any
        };
      });
      fn(fakedChangeEvent, 'local');
    })
  browser.storage.onChanged.addListener(fn);
}

import { SYNOLOGY_HOST_DOMAINS, DownloadStationTask } from './api';

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

export interface CachedState {
  sid?: string;
  tasks: DownloadStationTask[];
  lastPollingFailureMessage?: string;
}

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  'connection': true,
  'visibleTasks': true,
  'notifications': true
};

const SETTING_NAMES = Object.keys(_settingNames) as (keyof Settings)[];

export const SESSION_ID_KEY: keyof CachedState = 'sid';
export const TASKS_KEY: keyof CachedState = 'tasks';
export const LAST_POLLING_FAILURE_MESSAGE_KEY: keyof CachedState = 'lastPollingFailureMessage';

const _cachedStateNames: Record<keyof CachedState, true> = {
  'sid': true,
  'tasks': true,
  'lastPollingFailureMessage': true
};

const CACHED_STATE_NAMES = Object.keys(_cachedStateNames) as (keyof CachedState)[];

export interface StoredState extends Settings, CachedState {}

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

export const DEFAULT_CACHED_STATE: CachedState = {
  tasks: []
};

export function getHostUrl(settings: ConnectionSettings) {
  return `${settings.protocol}://${settings.hostname}.${settings.domain}:${settings.port}`;
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

export function onStoredStateChange(fn: (state: StoredState) => void, includeInitialValue: boolean = true) {
  Promise.all([ loadSettings(), browser.storage.local.get<CachedState>(CACHED_STATE_NAMES)])
    .then(([ settings, cached ]) => ({ ...DEFAULT_SETTINGS, ...DEFAULT_CACHED_STATE, ...settings, ...cached }))
    .then((initialStoredState: StoredState) => {
      if (includeInitialValue) {
        fn(initialStoredState);
      }
      browser.storage.onChanged.addListener((changes: StorageChangeEvent<StoredState>, areaName) => {
        if (areaName === 'local') {
          const extractedChanges: Partial<StoredState> = {};
          Object.keys(changes).map((key: keyof StoredState) => {
            extractedChanges[key] = changes[key] != null ? changes[key]!.newValue : undefined;
          });
          fn({
            ...initialStoredState,
            ...extractedChanges
          });
        }
      });
    })
}

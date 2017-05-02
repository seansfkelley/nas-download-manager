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

export interface CachedTasks {
  tasks: DownloadStationTask[];
  tasksFetchFailureMessage?: string;
  tasksFetchUpdateTimestamp: number;
}

export interface CachedAuthState {
  sid?: string;
}

export interface AllStoredState extends Settings, CachedTasks, CachedAuthState {}

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  'connection': true,
  'visibleTasks': true,
  'notifications': true
};

const SETTING_NAMES = Object.keys(_settingNames) as (keyof Settings)[];

const _allStoredStateNames: Record<keyof AllStoredState, true> = {
  ..._settingNames,
  'tasks': true,
  'tasksFetchFailureMessage': true,
  'tasksFetchUpdateTimestamp': true,
  'sid': true
};

const ALL_STORED_STATE_NAMES = Object.keys(_allStoredStateNames) as (keyof Settings)[];

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

const DEFAULT_ALL_STORED_STATE: AllStoredState = {
  ...DEFAULT_SETTINGS,
  tasks: [],
  tasksFetchUpdateTimestamp: 0
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

export function onStoredStateChange(fn: (state: AllStoredState) => void) {
  browser.storage.local.get<AllStoredState>(ALL_STORED_STATE_NAMES)
    .then(state => ({ ...DEFAULT_ALL_STORED_STATE, ...state }))
    .then((initialStoredState: AllStoredState) => {
      fn(initialStoredState);
      browser.storage.onChanged.addListener((changes: StorageChangeEvent<AllStoredState>, areaName) => {
        if (areaName === 'local') {
          const extractedChanges: Partial<AllStoredState> = {};
          Object.keys(changes).map((key: keyof AllStoredState) => {
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
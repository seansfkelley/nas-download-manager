import { DownloadStationTask } from './api';

export type Protocol = 'http' | 'https';

const _protocolNames: Record<Protocol, true> = {
  'http': true,
  'https': true
};

export const PROTOCOLS = Object.keys(_protocolNames) as Protocol[];

export interface ConnectionSettings {
  protocol: Protocol;
  hostname: string;
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
  taskFetchFailureReason: 'missing-config' | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
}

export interface AllStoredState extends Settings, CachedTasks {}

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
  'taskFetchFailureReason': true,
  'tasksLastInitiatedFetchTimestamp': true,
  'tasksLastCompletedFetchTimestamp': true
};

const ALL_STORED_STATE_NAMES = Object.keys(_allStoredStateNames) as (keyof Settings)[];

export const DEFAULT_SETTINGS: Settings = {
  connection: {
    protocol: 'https',
    hostname: '',
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
  taskFetchFailureReason: null,
  tasksLastInitiatedFetchTimestamp: null,
  tasksLastCompletedFetchTimestamp: null
};

export function getHostUrl(settings: ConnectionSettings) {
  if (settings.protocol && settings.hostname && settings.port) {
    return `${settings.protocol}://${settings.hostname}:${settings.port}`;
  } else {
    return undefined;
  }
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

let stateListeners: ((state: AllStoredState) => void)[] = [];

export function onStoredStateChange(listener: (state: AllStoredState) => void) {
  stateListeners.push(listener);
  fetchStateAndNotify([ listener ]);
}

function fetchStateAndNotify(listeners: ((state: AllStoredState) => void)[]) {
  return browser.storage.local.get<AllStoredState>(ALL_STORED_STATE_NAMES)
    .then(state => {
      const defaultedState = { ...DEFAULT_ALL_STORED_STATE, ...state };
      listeners.forEach(l => l(defaultedState));
    });
}

browser.storage.onChanged.addListener((_changes: StorageChangeEvent<AllStoredState>, areaName) => {
  if (areaName === 'local') {
    fetchStateAndNotify(stateListeners);
  }
});

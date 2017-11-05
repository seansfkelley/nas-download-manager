import once from 'lodash-es/once';
import { DownloadStationTask } from 'synology-typescript-api';

// This number should be incremented each time the shape of the cached tasks changes.
// Doing so will cause the cache to be clear on initialization and reloaded from the NAS.
export const CACHED_TASKS_VERSION = 1;

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

export type TaskSortType = 'name-asc' | 'name-desc' | 'timestamp-completed-asc' | 'timestamp-completed-desc' | 'timestamp-added-asc' | 'timestamp-added-desc' | 'completed-percent-asc' | 'completed-percent-desc';

export interface Settings {
  connection: ConnectionSettings;
  visibleTasks: VisibleTaskSettings;
  taskSortType: TaskSortType;
  notifications: NotificationSettings;
  shouldHandleDownloadLinks: boolean;
}

// HELLO THERE
//
// When changing the shape of this, you almost certainly want to update CACHED_TASKS_VERSION above.
export interface CachedTasks {
  tasks: DownloadStationTask[];
  taskFetchFailureReason: 'missing-config' | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
}

export interface StorageMeta {
  cachedTasksVersion?: number;
}

export interface AllStoredState extends Settings, CachedTasks, StorageMeta {}

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  'connection': true,
  'visibleTasks': true,
  'taskSortType': true,
  'notifications': true,
  'shouldHandleDownloadLinks': true
};

const SETTING_NAMES = Object.keys(_settingNames) as (keyof Settings)[];

const _cacheNames: Record<keyof CachedTasks, true> = {
  'tasks': true,
  'taskFetchFailureReason': true,
  'tasksLastInitiatedFetchTimestamp': true,
  'tasksLastCompletedFetchTimestamp': true
};

const _storageMetaNames: Record<keyof StorageMeta, true> = {
  'cachedTasksVersion': true
};

const STORAGE_META_NAMES = Object.keys(_storageMetaNames) as (keyof StorageMeta)[];

const _allStoredStateNames: Record<keyof AllStoredState, true> = {
  ..._settingNames,
  ..._cacheNames,
  ..._storageMetaNames
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
    completed: true,
    errored: true,
    other: true
  },
  taskSortType: 'name-asc',
  notifications: {
    enabled: false,
    pollingInterval: 60
  },
  shouldHandleDownloadLinks: true
};

const DEFAULT_ALL_STORED_STATE: AllStoredState = {
  ...DEFAULT_SETTINGS,
  tasks: [],
  taskFetchFailureReason: null,
  tasksLastInitiatedFetchTimestamp: null,
  tasksLastCompletedFetchTimestamp: null
};

export const ORDERED_VISIBLE_TASK_TYPE_NAMES: Record<keyof VisibleTaskSettings, string> = {
  downloading: browser.i18n.getMessage('Downloading'),
  uploading: browser.i18n.getMessage('Completed_uploading'),
  completed: browser.i18n.getMessage('Completed_not_uploading'),
  errored: browser.i18n.getMessage('Errored'),
  other: browser.i18n.getMessage('Other')
};

export const ORDERED_TASK_SORT_TYPE_NAMES: Record<TaskSortType, string> = {
  'name-asc': browser.i18n.getMessage('Name_AZ'),
  'name-desc': browser.i18n.getMessage('Name_ZA'),
  'timestamp-added-desc': browser.i18n.getMessage('Date_added_newest_first'),
  'timestamp-added-asc': browser.i18n.getMessage('Date_added_oldest_first'),
  'timestamp-completed-desc': browser.i18n.getMessage('Date_completed_newest_first'),
  'timestamp-completed-asc': browser.i18n.getMessage('Date_completed_oldest_first'),
  'completed-percent-asc': browser.i18n.getMessage('_complete_least_first'),
  'completed-percent-desc': browser.i18n.getMessage('_complete_most_first')
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

const attachSharedStateListener = once(() => {
  browser.storage.onChanged.addListener((_changes: StorageChangeEvent<AllStoredState>, areaName) => {
    if (areaName === 'local') {
      fetchStateAndNotify(stateListeners);
    }
  });
});

export function clearTaskCacheIfNecessary() {
  return browser.storage.local.get<StorageMeta>(STORAGE_META_NAMES)
    .then(meta => {
      if (meta == null || meta.cachedTasksVersion !== CACHED_TASKS_VERSION) {
        console.log(`got task cache version ${meta == null ? null : meta.cachedTasksVersion} but needed ${CACHED_TASKS_VERSION}, will clear`);
        const emptyTaskCacheAndVersionBump: CachedTasks & StorageMeta = {
          tasks: [],
          taskFetchFailureReason: null,
          tasksLastCompletedFetchTimestamp: null,
          tasksLastInitiatedFetchTimestamp: null,
          cachedTasksVersion: CACHED_TASKS_VERSION
        };
        return browser.storage.local.set(emptyTaskCacheAndVersionBump);
      } else {
        console.log('no need to clear task cache, version checks out');
        return Promise.resolve();
      }
    })
}

export function onStoredStateChange(listener: (state: AllStoredState) => void) {
  attachSharedStateListener();
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

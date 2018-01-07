import once from 'lodash-es/once';

import {
  Protocol,
  Settings,
  CachedTasks,
  VisibleTaskSettings,
  TaskSortType,
  ConnectionSettings,
  State,
  Logging,
} from './latest';
import { state0to1 } from './1';
import { state1to2 } from './2';

export * from './latest';

const STATE_VERSION = 2;

const _protocolNames: Record<Protocol, true> = {
  'http': true,
  'https': true
};

export const PROTOCOLS = Object.keys(_protocolNames) as Protocol[];

export interface StateMeta {
  stateVersion?: number;
}

export interface StateWithMeta extends State, StateMeta {}

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  'connection': true,
  'visibleTasks': true,
  'taskSortType': true,
  'notifications': true,
  'shouldHandleDownloadLinks': true
};

export const SETTING_NAMES = Object.keys(_settingNames) as (keyof Settings)[];

const _cacheNames: Record<keyof CachedTasks, true> = {
  'tasks': true,
  'taskFetchFailureReason': true,
  'tasksLastInitiatedFetchTimestamp': true,
  'tasksLastCompletedFetchTimestamp': true
};

const _loggingNames: Record<keyof Logging, true> = {
  'lastSevereError': true,
};

const _stateMetaNames: Record<keyof StateMeta, true> = {
  'stateVersion': true
};

const STORAGE_META_NAMES = Object.keys(_stateMetaNames) as (keyof StateMeta)[];

const _stateWithMetaNames: Record<keyof StateWithMeta, true> = {
  ..._loggingNames,
  ..._settingNames,
  ..._cacheNames,
  ..._stateMetaNames
};

const ALL_STORED_STATE_NAMES = Object.keys(_stateWithMetaNames) as (keyof Settings)[];

export const ORDERED_VISIBLE_TASK_TYPE_NAMES: Record<keyof VisibleTaskSettings, string> = {
  downloading: browser.i18n.getMessage('Downloading'),
  uploading: browser.i18n.getMessage('Completed_uploading'),
  completed: browser.i18n.getMessage('Completed_not_uploading'),
  errored: browser.i18n.getMessage('Errored'),
  other: browser.i18n.getMessage('Other')
};

export const ORDERED_TASK_SORT_TYPE_NAMES: Record<TaskSortType, string> = {
  'name-asc': browser.i18n.getMessage('name_AZ'),
  'name-desc': browser.i18n.getMessage('name_ZA'),
  'timestamp-added-desc': browser.i18n.getMessage('date_added_newest_first'),
  'timestamp-added-asc': browser.i18n.getMessage('date_added_oldest_first'),
  'timestamp-completed-desc': browser.i18n.getMessage('date_completed_newest_first'),
  'timestamp-completed-asc': browser.i18n.getMessage('date_completed_oldest_first'),
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

let stateListeners: ((state: State) => void)[] = [];

const attachSharedStateListener = once(() => {
  browser.storage.onChanged.addListener((_changes: StorageChangeEvent<State>, areaName) => {
    if (areaName === 'local') {
      fetchStateAndNotify(stateListeners);
    }
  });
});

const STATE_TRANSFORMS: ((state: any) => any)[] = [
  state0to1,
  state1to2,
];

export function updateStateShapeIfNecessary() {
  function updateStateToLatest() {
    return browser.storage.local.get<any>(null)
      .then(state => {
        // state.tasks existing is implicitly the same as version 1 because version 1 was the shape
        // of the state when this more-formal system was created. state.tasks is a good value to check
        // because it is very likely to exist. If it doesn't, the user never successfully logged in
        // and it's probably fine to wipe their state clean.
        const version = ((state as StateMeta).stateVersion) || (state.tasks != null ? 1 : 0);
        STATE_TRANSFORMS.slice(version).forEach((transform, i) => {
          console.log(`updating state shape to version ${i + version + 1}`);
          state = transform(state);
        });
        const stateMeta: StateMeta = { stateVersion: STATE_VERSION };
        return browser.storage.local.set({
          ...state,
          ...stateMeta,
        });
      });
  }

  return browser.storage.local.get<StateMeta>(STORAGE_META_NAMES)
    .then(meta => {
      if (meta != null) {
        if (meta.stateVersion === STATE_VERSION) {
          console.log('state is already at desired version, not applying any transforms');
          return Promise.resolve();
        } else if (meta.stateVersion == null || meta.stateVersion < STATE_VERSION) {
          console.log('meta version is outdated or missing, updating state shape...');
          return updateStateToLatest();
        } else if (meta.stateVersion > STATE_VERSION) {
          return Promise.reject(new Error(`cached version of state is too new; got ${meta.stateVersion} but only understand up to ${STATE_VERSION}`));
        } else {
          return Promise.reject(new Error('unhandled branch in state update logic!'));
        }
      } else {
        console.log('meta is missing, updating state shape...');
        return updateStateToLatest();
      }
    });
}

export function onStoredStateChange(listener: (state: State) => void) {
  attachSharedStateListener();
  stateListeners.push(listener);
  fetchStateAndNotify([ listener ]);
}

function fetchStateAndNotify(listeners: ((state: State) => void)[]) {
  return browser.storage.local.get<State>(ALL_STORED_STATE_NAMES)
    .then(state => {
      listeners.forEach(l => l(state));
    });
}

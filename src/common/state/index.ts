import once from 'lodash-es/once';
import mapValues from 'lodash-es/mapValues';

import {
  Protocol,
  Settings,
  CachedTasks,
  VisibleTaskSettings,
  TaskSortType,
  ConnectionSettings,
  State,
  Logging,
  StateVersion,
} from './latest';
import { state0to1 } from './1';
import { state1to2 } from './2';

export * from './latest';

const LATEST_STATE_VERSION: typeof (StateVersion['stateVersion']) = 2;

interface AnyStateVersion {
  stateVersion: number;
}

function isVersioned(state: any): state is AnyStateVersion {
  return state && (state as AnyStateVersion).stateVersion != null;
}

const _protocolNames: Record<Protocol, true> = {
  'http': true,
  'https': true,
};

export const PROTOCOLS = Object.keys(_protocolNames) as Protocol[];

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  'connection': true,
  'visibleTasks': true,
  'taskSortType': true,
  'notifications': true,
  'shouldHandleDownloadLinks': true,
};

export const SETTING_NAMES = Object.keys(_settingNames) as (keyof Settings)[];

const _versionNames: Record<keyof StateVersion, true> = {
  'stateVersion': true,
};

const VERSION_NAMES = Object.keys(_versionNames) as (keyof StateVersion)[];

const _allStateNames: Record<keyof State, true> = {
  ..._settingNames,
  ..._versionNames,
  'tasks': true,
  'taskFetchFailureReason': true,
  'tasksLastInitiatedFetchTimestamp': true,
  'tasksLastCompletedFetchTimestamp': true,
  'lastSevereError': true,
};

const ALL_STORED_STATE_NAMES = Object.keys(_allStateNames) as (keyof Settings)[];

export const ORDERED_VISIBLE_TASK_TYPE_NAMES: Record<keyof VisibleTaskSettings, string> = {
  downloading: browser.i18n.getMessage('Downloading'),
  uploading: browser.i18n.getMessage('Completed_uploading'),
  completed: browser.i18n.getMessage('Completed_not_uploading'),
  errored: browser.i18n.getMessage('Errored'),
  other: browser.i18n.getMessage('Other'),
};

export const ORDERED_TASK_SORT_TYPE_NAMES: Record<TaskSortType, string> = {
  'name-asc': browser.i18n.getMessage('name_AZ'),
  'name-desc': browser.i18n.getMessage('name_ZA'),
  'timestamp-added-desc': browser.i18n.getMessage('date_added_newest_first'),
  'timestamp-added-asc': browser.i18n.getMessage('date_added_oldest_first'),
  'timestamp-completed-desc': browser.i18n.getMessage('date_completed_newest_first'),
  'timestamp-completed-asc': browser.i18n.getMessage('date_completed_oldest_first'),
  'completed-percent-asc': browser.i18n.getMessage('_complete_least_first'),
  'completed-percent-desc': browser.i18n.getMessage('_complete_most_first'),
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

// Exported for testing.
export function _updateStateToLatest(state: any | null): State {
  function getStartingVersion() {
    if (state == null) {
      return 0;
    } else if (isVersioned(state)) {
      if (state.stateVersion == null) {
        return 0;
      } else {
        return state.stateVersion;
      }
    } else if (state.tasks != null) {
      // state.tasks existing is implicitly the same as version 1 because version 1 was the shape
      // of the state when this more-formal system was created. state.tasks is a good value to check
      // because it is very likely to exist. If it doesn't, the user never successfully logged in
      // and it's probably fine to wipe their state clean.
      return 1;
    } else {
      return 0;
    }
  }

  const version = getStartingVersion();

  if (version > LATEST_STATE_VERSION) {
    throw new Error(`cannot downgrade state shape from ${version} to ${LATEST_STATE_VERSION}`);
  }

  STATE_TRANSFORMS.slice(version).forEach((transform, i) => {
    console.log(`updating state shape to version ${i + version + 1}`);
    state = transform(state);
  });

  return state;
}

export function updateStateShapeIfNecessary() {
  return browser.storage.local.get<any>(null)
    .then(_updateStateToLatest)
    .then(updatedState => {
      return browser.storage.local.set(updatedState);
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

export function redactState(state: State): object {
  const sanitizedConnection: Record<keyof ConnectionSettings, boolean | Protocol> = {
    ...mapValues(state.connection, Boolean),
    protocol: state.connection.protocol,
  };

  return {
    ...state,
    lastSevereError: state.lastSevereError ? '(omitted for brevity)' : undefined,
    connection: sanitizedConnection,
    tasks: state.tasks.length,
  };
}

import once from "lodash-es/once";
import mapValues from "lodash-es/mapValues";

import {
  Protocol,
  Settings,
  VisibleTaskSettings,
  TaskSortType,
  ConnectionSettings,
  State,
} from "./latest";
import { updateStateToLatest } from "./update";
export * from "./latest";

const _protocolNames: Record<Protocol, true> = {
  http: true,
  https: true,
};

export const PROTOCOLS = Object.keys(_protocolNames) as Protocol[];

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  connection: true,
  visibleTasks: true,
  taskSortType: true,
  notifications: true,
  shouldHandleDownloadLinks: true,
};

export const SETTING_NAMES = Object.keys(_settingNames) as (keyof Settings)[];

const _allStateNames: Record<keyof State, true> = {
  ..._settingNames,
  tasks: true,
  taskFetchFailureReason: true,
  tasksLastInitiatedFetchTimestamp: true,
  tasksLastCompletedFetchTimestamp: true,
  lastSevereError: true,
  stateVersion: true,
};

const ALL_STORED_STATE_NAMES = Object.keys(_allStateNames) as (keyof State)[];

export const ORDERED_VISIBLE_TASK_TYPE_NAMES: Record<keyof VisibleTaskSettings, string> = {
  downloading: browser.i18n.getMessage("Downloading"),
  uploading: browser.i18n.getMessage("Completed_uploading"),
  completed: browser.i18n.getMessage("Completed_not_uploading"),
  errored: browser.i18n.getMessage("Errored"),
  other: browser.i18n.getMessage("Other"),
};

export const ORDERED_TASK_SORT_TYPE_NAMES: Record<TaskSortType, string> = {
  "name-asc": browser.i18n.getMessage("name_AZ"),
  "name-desc": browser.i18n.getMessage("name_ZA"),
  "timestamp-added-desc": browser.i18n.getMessage("date_added_newest_first"),
  "timestamp-added-asc": browser.i18n.getMessage("date_added_oldest_first"),
  "timestamp-completed-desc": browser.i18n.getMessage("date_completed_newest_first"),
  "timestamp-completed-asc": browser.i18n.getMessage("date_completed_oldest_first"),
  "completed-percent-asc": browser.i18n.getMessage("_complete_least_first"),
  "completed-percent-desc": browser.i18n.getMessage("_complete_most_first"),
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
    if (areaName === "local") {
      fetchStateAndNotify(stateListeners);
    }
  });
});

export function updateStateShapeIfNecessary() {
  return browser.storage.local
    .get<any>(null)
    .then(updateStateToLatest)
    .then(updatedState => {
      return browser.storage.local.set(updatedState);
    });
}

export function onStoredStateChange(listener: (state: State) => void) {
  attachSharedStateListener();
  stateListeners.push(listener);
  fetchStateAndNotify([listener]);
}

function fetchStateAndNotify(listeners: ((state: State) => void)[]) {
  return browser.storage.local.get<State>(ALL_STORED_STATE_NAMES).then(state => {
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
    lastSevereError: state.lastSevereError ? "(omitted for brevity)" : undefined,
    connection: sanitizedConnection,
    tasks: state.tasks.length,
  };
}

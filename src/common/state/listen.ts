import { Settings, State } from "./latest";

// Somewhat awkward trick to make sure the compiler enforces that this runtime constant
// includes all the compile-time type names.
const _settingNames: Record<keyof Settings, true> = {
  connection: true,
  visibleTasks: true,
  taskSortType: true,
  notifications: true,
  shouldHandleDownloadLinks: true,
  badgeDisplayType: true,
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

async function fetchStateAndNotify(listeners: ((state: State) => void)[]) {
  const state = await browser.storage.local.get<State>(ALL_STORED_STATE_NAMES);
  listeners.forEach(l => l(state));
}

let stateListeners: ((state: State) => void)[] = [];

let didAttachSingletonListener = false;

function attachSharedStateListener() {
  if (!didAttachSingletonListener) {
    didAttachSingletonListener = true;
    browser.storage.onChanged.addListener((_changes: StorageChangeEvent<State>, areaName) => {
      if (areaName === "local") {
        fetchStateAndNotify(stateListeners);
      }
    });
  }
}

export function onStoredStateChange(listener: (state: State) => void) {
  attachSharedStateListener();
  stateListeners.push(listener);
  fetchStateAndNotify([listener]);
}

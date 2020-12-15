import type { Settings, State } from "./latest";
import { typesafeUnionMembers } from "../lang";

export const SETTING_NAMES = typesafeUnionMembers<keyof Settings>({
  connection: true,
  visibleTasks: true,
  taskSortType: true,
  notifications: true,
  shouldHandleDownloadLinks: true,
  badgeDisplayType: true,
  torrentTrackers: true,
});

const ALL_STORED_STATE_NAMES = typesafeUnionMembers<keyof State>({
  settings: true,
  tasks: true,
  taskFetchFailureReason: true,
  tasksLastInitiatedFetchTimestamp: true,
  tasksLastCompletedFetchTimestamp: true,
  lastSevereError: true,
  stateVersion: true,
});

async function fetchStateAndNotify(listeners: ((state: State) => void)[]) {
  const state = await browser.storage.local.get<State>(ALL_STORED_STATE_NAMES);
  listeners.forEach((l) => l(state));
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

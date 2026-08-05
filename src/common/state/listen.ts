import { type Settings, State } from "./migrations/latest";
import { typesafeUnionMembers } from "../lang";

export const SETTING_NAMES = typesafeUnionMembers<keyof Settings>({
  connection: true,
  visibleTasks: true,
  taskSortType: true,
  notifications: true,
  shouldHandleDownloadLinks: true,
  badgeDisplayType: true,
  showInactiveTasks: true,
});

async function fetchStateAndNotify(listeners: ((state: State) => void)[]) {
  const state = await State.get();
  listeners.forEach((l) => l(state));
}

let stateListeners: ((state: State) => void)[] = [];

let didAttachSingletonListener = false;

function attachSharedStateListener() {
  if (!didAttachSingletonListener) {
    didAttachSingletonListener = true;
    browser.storage.onChanged.addListener((_changes, areaName) => {
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

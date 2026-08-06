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

// Registered at module load rather than on first subscription: a non-persistent background context
// is woken for this event and drops it unless the listener exists by the end of the initial
// evaluation, which is too early for any subscriber to have run.
browser.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "local") {
    fetchStateAndNotify(stateListeners);
  }
});

export function onStoredStateChange(listener: (state: State) => void) {
  stateListeners.push(listener);
  fetchStateAndNotify([listener]);
}

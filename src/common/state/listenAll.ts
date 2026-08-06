import { PersistentState } from "./migrations/latest";
import { LATEST_STATE_VERSION } from "./migrations/update";
import { CACHED_TASK_NAMES, type CachedTasks, getCachedTasks, SessionState } from "./session";

// Flattened together because nothing above this layer cares which storage area a key came from, and
// several components read settings and tasks in the same breath.
export interface ExtensionState extends PersistentState, CachedTasks {}

async function fetchStateAndNotify(listeners: ((state: ExtensionState) => void)[]) {
  const [persistent, session] = await Promise.all([PersistentState.get(), SessionState.get()]);
  // See onPersistentStateChange: the same pre-migration read happens here, for the same reason.
  if (persistent.stateVersion === LATEST_STATE_VERSION) {
    const state = { ...persistent, ...getCachedTasks(session) };
    listeners.forEach((l) => l(state));
  }
}

let stateListeners: ((state: ExtensionState) => void)[] = [];

// Registered at module load rather than on first subscription: a non-persistent background context
// is woken for these events and drops them unless the listeners exist by the end of the initial
// evaluation, which is too early for any subscriber to have run.
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    fetchStateAndNotify(stateListeners);
  } else if (areaName === "session") {
    // The rest of the session state is background bookkeeping that nothing renders, and one piece
    // of it -- the finished-task ids -- is written by a listener registered here. Ignoring it is
    // what stops that from feeding itself forever.
    if (CACHED_TASK_NAMES.some((name) => name in changes)) {
      fetchStateAndNotify(stateListeners);
    }
  }
});

// Not usable from a content script, which cannot see storage.session at all.
export function onExtensionStateChange(listener: (state: ExtensionState) => void) {
  stateListeners.push(listener);
  fetchStateAndNotify([listener]);
}

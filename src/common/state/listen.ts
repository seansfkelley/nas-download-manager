import { type Settings, PersistentState } from "./migrations/latest";
import { LATEST_STATE_VERSION } from "./migrations/update";
import { CACHED_TASK_NAMES, type CachedTasks, getCachedTasks, SessionState } from "./session";
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

// PersistentState.get's cast is a promise that the stored state is the current shape, and
// migrateStoredState is what keeps it. Until that has run, this is the answer: nothing. Anything
// reading outside a listener wants this rather than PersistentState.get.
export async function getCurrentPersistentState(): Promise<PersistentState | undefined> {
  const state = await PersistentState.get();
  return state.stateVersion === LATEST_STATE_VERSION ? state : undefined;
}

async function notifyPersistent(listeners: ((state: PersistentState) => void)[]) {
  if (listeners.length === 0) {
    return;
  }
  // On install and upgrade the background starts, and this reads, before runtime.onInstalled fires
  // the migration. Declining is the whole handling: finishing the migration writes to storage,
  // which arrives back here as a change and delivers to everyone.
  const state = await getCurrentPersistentState();
  if (state != null) {
    listeners.forEach((l) => l(state));
  }
}

async function notifyCachedTasks(listeners: ((cachedTasks: CachedTasks) => void)[]) {
  // Not merely an optimization. A content script can subscribe to the persistent half, and must
  // never reach storage.session, which it cannot see.
  if (listeners.length === 0) {
    return;
  }
  const cachedTasks = getCachedTasks(await SessionState.get());
  listeners.forEach((l) => l(cachedTasks));
}

let persistentListeners: ((state: PersistentState) => void)[] = [];
let cachedTasksListeners: ((cachedTasks: CachedTasks) => void)[] = [];

// Registered at module load rather than on first subscription: a non-persistent background context
// is woken for this event and drops it unless the listener exists by the end of the initial
// evaluation, which is too early for any subscriber to have run.
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    notifyPersistent(persistentListeners);
  } else if (areaName === "session") {
    // The rest of the session state is bookkeeping that no subscriber reads, and some of it is
    // written from these very listeners.
    if (CACHED_TASK_NAMES.some((name) => name in changes)) {
      notifyCachedTasks(cachedTasksListeners);
    }
  }
});

// Settings and the error log, and the only half a content script can have: storage.session is off
// limits there.
export function onPersistentStateChange(listener: (state: PersistentState) => void) {
  persistentListeners.push(listener);
  notifyPersistent([listener]);
}

export function onCachedTasksChange(listener: (cachedTasks: CachedTasks) => void) {
  cachedTasksListeners.push(listener);
  notifyCachedTasks([listener]);
}

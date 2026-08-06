import { type Settings, PersistentState } from "./migrations/latest";
import { LATEST_STATE_VERSION } from "./migrations/update";
import { type SessionStateView, SessionState } from "./session";
import { typesafePick, typesafeUnionMembers } from "../lang";

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

// Subscribers name the keys they read and are handed those, and only those. Naming them is what
// makes it safe to write to storage from a listener: a subscriber is woken only for keys it asked
// for, so a write to any other key cannot come back around. saveLastSevereError is the reason this
// exists -- it writes from inside an error handler that runs off this very event, and the message
// it writes carries a timestamp, so no two of them are ever equal.
//
// Five is the ceiling because that is well past what anything asks for; add a sixth when something
// needs it.
interface Listenable<T> {
  <K1 extends keyof T>(key1: K1, listener: (state: Pick<T, K1>) => void): void;
  <K1 extends keyof T, K2 extends keyof T>(
    key1: K1,
    key2: K2,
    listener: (state: Pick<T, K1 | K2>) => void,
  ): void;
  <K1 extends keyof T, K2 extends keyof T, K3 extends keyof T>(
    key1: K1,
    key2: K2,
    key3: K3,
    listener: (state: Pick<T, K1 | K2 | K3>) => void,
  ): void;
  <K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T>(
    key1: K1,
    key2: K2,
    key3: K3,
    key4: K4,
    listener: (state: Pick<T, K1 | K2 | K3 | K4>) => void,
  ): void;
  <
    K1 extends keyof T,
    K2 extends keyof T,
    K3 extends keyof T,
    K4 extends keyof T,
    K5 extends keyof T,
  >(
    key1: K1,
    key2: K2,
    key3: K3,
    key4: K4,
    key5: K5,
    listener: (state: Pick<T, K1 | K2 | K3 | K4 | K5>) => void,
  ): void;
}

interface Subscription<T> {
  keys: (keyof T)[];
  deliver: (state: T) => void;
}

// fetch returning undefined means "not deliverable right now" and is passed on as silence.
function listenable<T extends object>(
  areaName: "local" | "session",
  fetch: () => Promise<T | undefined>,
): Listenable<T> {
  const subscriptions: Subscription<T>[] = [];

  async function notify(subset: Subscription<T>[]) {
    // Not merely an optimization. A content script can subscribe to the persistent area and must
    // never reach storage.session, which it cannot see, so nothing may fetch unspoken for.
    if (subset.length === 0) {
      return;
    }
    const state = await fetch();
    if (state != null) {
      subset.forEach((s) => s.deliver(state));
    }
  }

  // Registered at module load rather than on first subscription: a non-persistent background
  // context is woken for this event and drops it unless the listener exists by the end of the
  // initial evaluation, which is too early for any subscriber to have run.
  browser.storage.onChanged.addListener((changes, changedArea) => {
    if (changedArea === areaName) {
      notify(subscriptions.filter((s) => s.keys.some((key) => (key as string) in changes)));
    }
  });

  return (...args: unknown[]) => {
    const keys = args.slice(0, -1) as (keyof T)[];
    const listener = args[args.length - 1] as (state: Partial<T>) => void;

    const subscription: Subscription<T> = {
      keys,
      deliver: (state) => listener(typesafePick(state, ...keys)),
    };

    subscriptions.push(subscription);
    notify([subscription]);
  };
}

// Settings and the error log, and the only area a content script can subscribe to.
export const onPersistentStateChange = listenable<PersistentState>(
  "local",
  getCurrentPersistentState,
);

export const onSessionStateChange = listenable<SessionStateView>("session", SessionState.view);

import { PersistentState } from "./migrations/latest";
import { LATEST_STATE_VERSION } from "./migrations/update";
import { SessionState } from "./session";
import { typesafePick } from "../lang";

interface Listenable<T> {
  <K1 extends keyof T>(key1: K1, listener: (state: Pick<T, K1>) => Promise<void>): void;
  <K1 extends keyof T, K2 extends keyof T>(
    key1: K1,
    key2: K2,
    listener: (state: Pick<T, K1 | K2>) => Promise<void>,
  ): void;
  <K1 extends keyof T, K2 extends keyof T, K3 extends keyof T>(
    key1: K1,
    key2: K2,
    key3: K3,
    listener: (state: Pick<T, K1 | K2 | K3>) => Promise<void>,
  ): void;
  <K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T>(
    key1: K1,
    key2: K2,
    key3: K3,
    key4: K4,
    listener: (state: Pick<T, K1 | K2 | K3 | K4>) => Promise<void>,
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
    listener: (state: Pick<T, K1 | K2 | K3 | K4 | K5>) => Promise<void>,
  ): void;
}

function listenable<T extends object>(
  area: browser.storage.StorageArea,
  // If fetch returns undefined, the listener is not called.
  fetch: () => Promise<T | undefined>,
): Listenable<T> {
  return (...args: unknown[]) => {
    const keys = new Set(args.slice(0, -1) as (keyof T)[]);
    const listener = args[args.length - 1] as (state: Partial<T>) => void;

    async function notify() {
      const state = await fetch();
      if (state != null) {
        listener(typesafePick(state, ...keys));
      }
    }

    // This line must be hit at module initialization time to correctly register itself.
    area.onChanged.addListener(async (changes) => {
      if (Object.keys(changes).some((k) => keys.has(k as unknown as keyof T))) {
        notify();
      }
    });

    notify();
  };
}

export const onPersistentStateChange = listenable<PersistentState>(
  browser.storage.local,
  async () => {
    const state = await PersistentState.get();
    // Silently drop notifications until we've migrated, which is controlled elsewhere. Migration
    // will write, so we will be triggered again.
    return state.stateVersion === LATEST_STATE_VERSION ? state : undefined;
  },
);

export const onSessionStateChange = listenable<SessionState>(
  browser.storage.session,
  SessionState.get,
);

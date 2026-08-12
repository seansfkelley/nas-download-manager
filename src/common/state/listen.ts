import { typesafePick } from "../lang";

import { PersistentState } from "./PersistentState";
import { SessionState } from "./SessionState";

interface Reactable<T> {
  <K1 extends keyof T>(key1: K1, listener: (state: Pick<T, K1>) => void | Promise<void>): void;
  <K1 extends keyof T, K2 extends keyof T>(
    key1: K1,
    key2: K2,
    listener: (state: Pick<T, K1 | K2>) => void | Promise<void>,
  ): void;
  <K1 extends keyof T, K2 extends keyof T, K3 extends keyof T>(
    key1: K1,
    key2: K2,
    key3: K3,
    listener: (state: Pick<T, K1 | K2 | K3>) => void | Promise<void>,
  ): void;
  <K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T>(
    key1: K1,
    key2: K2,
    key3: K3,
    key4: K4,
    listener: (state: Pick<T, K1 | K2 | K3 | K4>) => void | Promise<void>,
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
    listener: (state: Pick<T, K1 | K2 | K3 | K4 | K5>) => void | Promise<void>,
  ): void;
}

// "React" means it's called for initial state as well as every change. Plan accordingly.
function reactable<T extends object>(
  areaName: "local" | "session" | "sync",
  // If fetch returns undefined, the callback is not called.
  fetch: () => Promise<T | undefined>,
): Reactable<T> {
  return (...args: unknown[]) => {
    const keys = new Set(args.slice(0, -1) as (keyof T)[]);
    const callback = args[args.length - 1] as (state: Partial<T>) => void;

    async function notify() {
      const state = await fetch();
      if (state != null) {
        callback(typesafePick(state, ...keys));
      }
    }

    // This line must be hit at module initialization time to correctly register itself.
    browser.storage[areaName].onChanged.addListener(async (changes) => {
      const changedKeys = Object.keys(changes);
      const triggeringKeys = changedKeys.filter((k) => keys.has(k as unknown as keyof T));
      if (triggeringKeys.length > 0) {
        console.log(`triggering listener for browser.storage.${areaName} due to change`, {
          listeningKeys: keys,
          changedKeys,
          triggeringKeys,
        });
        notify();
      }
    });

    console.log(`triggering listener for browser.storage.${areaName} for initial load`);
    notify();
  };
}

export const reactToPersistentState = reactable<PersistentState>("local", PersistentState.get);
export const reactToSessionState = reactable<SessionState>("session", SessionState.get);

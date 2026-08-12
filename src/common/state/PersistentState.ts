import { nullToUndefined, typesafeUnionMembers, undefinedToNull } from "../lang";

import { State } from "./migrations/latest";
import { LATEST_STATE_VERSION } from "./migrations/migrateState";

export const ALL_STORED_STATE_NAMES = typesafeUnionMembers<keyof State>({
  settings: true,
  lastSevereError: true,
  stateVersion: true,
});

interface AnyState {
  stateVersion?: number;
}

export type PersistentState = State;
export const PersistentState = {
  async get(): Promise<State | undefined> {
    const state = (await browser.storage.local.get(ALL_STORED_STATE_NAMES)) as AnyState;
    if (state.stateVersion == LATEST_STATE_VERSION) {
      console.log("fetched persistent state");
      return nullToUndefined(state as State);
    } else {
      console.warn("failed to fetch persistent state: not yet migrated");
      return undefined;
    }
  },

  async set(state: Partial<State>): Promise<void> {
    await browser.storage.local.set(undefinedToNull(state));
    console.log("set persistent state for keys:", Object.keys(state));
  },
};

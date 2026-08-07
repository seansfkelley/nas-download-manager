// Aliased because the exported namespace below also claims the name State, and TypeScript refuses a
// merged declaration whose parts are not all exported (TS2395).
import type { State as LatestState } from "./9";
import { typesafeUnionMembers } from "../../lang";
import { LATEST_STATE_VERSION } from "./update";

export type {
  Protocol,
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  Settings,
  ConnectionSettings,
  Logging,
  StateVersion,
  BadgeDisplayType,
  State as PersistentState,
} from "./9";

export const ALL_STORED_STATE_NAMES = typesafeUnionMembers<keyof LatestState>({
  settings: true,
  lastSevereError: true,
  stateVersion: true,
});

interface AnyState {
  stateVersion?: unknown;
}

export namespace PersistentState {
  export async function get(): Promise<LatestState | undefined> {
    let state = (await browser.storage.local.get(ALL_STORED_STATE_NAMES)) as AnyState;
    if (state.stateVersion == LATEST_STATE_VERSION) {
      console.log("fetched persistent state");
      return state as LatestState;
    } else {
      console.warn("failed to fetch persistent state: not yet migrated");
      return undefined;
    }
  }

  export async function set(state: Partial<LatestState>): Promise<void> {
    await browser.storage.local.set(state);
    console.log("set persistent state for keys:", Object.keys(state));
  }
}

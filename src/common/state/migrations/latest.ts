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
      return state as LatestState;
    } else {
      return undefined;
    }
  }

  export function set(state: Partial<LatestState>): Promise<void> {
    return browser.storage.local.set(state);
  }
}

// Aliased because the exported namespace below also claims the name State, and TypeScript refuses a
// merged declaration whose parts are not all exported (TS2395).
import type { State as LatestState } from "./9";
import { typesafeUnionMembers } from "../../lang";

export type {
  Protocol,
  VisibleTaskSettings,
  TaskSortType,
  CachedTasks,
  NotificationSettings,
  Settings,
  ConnectionSettings,
  Logging,
  StateVersion,
  BadgeDisplayType,
  State,
} from "./9";

export const ALL_STORED_STATE_NAMES = typesafeUnionMembers<keyof LatestState>({
  settings: true,
  tasks: true,
  taskFetchFailureReason: true,
  tasksLastInitiatedFetchTimestamp: true,
  tasksLastCompletedFetchTimestamp: true,
  lastSevereError: true,
  stateVersion: true,
});

// Type-safe read/write pair that comes for free with importing the type. Both assume the stored
// state is already the latest shape; migrateStoredState is what makes that true, and it runs from
// runtime.onInstalled.
export namespace State {
  export async function get(): Promise<LatestState> {
    return (await browser.storage.local.get(ALL_STORED_STATE_NAMES)) as LatestState;
  }

  // Partial writes are safe because writers own disjoint keys, so two of them cannot clobber.
  export function set(state: Partial<LatestState>): Promise<void> {
    return browser.storage.local.set(state);
  }
}

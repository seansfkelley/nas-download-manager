// Aliased because the exported namespace below also claims the name State, and TypeScript refuses a
// merged declaration whose parts are not all exported (TS2395).
import type { State as LatestState } from "./9";
import { LATEST_STATE_VERSION, migrateState } from "./update";
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

const ALL_STORED_STATE_NAMES = typesafeUnionMembers<keyof LatestState>({
  settings: true,
  tasks: true,
  taskFetchFailureReason: true,
  tasksLastInitiatedFetchTimestamp: true,
  tasksLastCompletedFetchTimestamp: true,
  lastSevereError: true,
  stateVersion: true,
});

// Type-safe read/write pair that comes for free with importing the type.
export namespace State {
  // Migrating here rather than at startup means no context can read an older shape whichever one
  // runs first, and a failed migration retries on the next read instead of wedging. The stored shape
  // only changes across a restart, because updating the extension tears every context down, so this
  // writes back at most once per install.
  export async function get(): Promise<LatestState> {
    const stored = await browser.storage.local.get(null);
    if (stored.stateVersion === LATEST_STATE_VERSION) {
      return stored as LatestState;
    }
    // migrateState is a pure function of what it reads, so two contexts racing here compute the same
    // result and the duplicate write costs nothing. Nothing has to elect an owner.
    const migrated = migrateState(stored);
    await browser.storage.local.set(migrated);
    const abandoned = Object.keys(stored).filter(
      (key) => !ALL_STORED_STATE_NAMES.includes(key as keyof LatestState),
    );
    if (abandoned.length > 0) {
      await browser.storage.local.remove(abandoned);
    }
    return migrated;
  }

  // Partial, and safely so: the version check means the keys this leaves alone are already in the
  // shape stateVersion claims. Writers own disjoint keys, so two of them cannot clobber.
  export async function set(state: Partial<LatestState>): Promise<void> {
    // Reading one field is the whole fast path. Only a mismatch pays for the full read, and only
    // once per install.
    const { stateVersion } = await browser.storage.local.get("stateVersion");
    if (stateVersion !== LATEST_STATE_VERSION) {
      await get();
    }
    await browser.storage.local.set(state);
  }
}

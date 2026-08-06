import type { AuthResult } from "../apis/synology";
import type { DownloadStationTask } from "../apis/synology/DownloadStation/Task";
import { typesafeUnionMembers } from "../lang";

// Split only for convenience; a lot of the frontend does not care one whit about the other fields.
export interface TaskState {
  tasks?: DownloadStationTask[];
  taskFetchFailureReason?: "missing-config" | "login-required" | { failureMessage: string };
  tasksLastInitiatedFetchTimestamp?: number;
  tasksLastCompletedFetchTimestamp?: number;
}

export interface SessionState extends TaskState {
  // TODO: This probably does not need to be keyed like this.
  // Keyed on the connection it was obtained with, so that changing any of the credentials discards
  // it without anyone having to remember to. Reusing a session against a different DiskStation, or
  // reusing "incorrect password" against a password the user has since fixed, are both wrong, and
  // both are unreachable if the key has to match.
  auth?: { connection: string; result: AuthResult };
  // Only set when "remember password" is off, where the password deliberately never reaches
  // storage.local and would otherwise be lost along with module scope.
  password?: string;
  // An array because Set does not serialize. Absent means no poll has completed yet, which is what
  // keeps the first poll from notifying about everything that finished before we were watching.
  finishedTaskIds?: string[];
}

// This means that we don't have to be careful about loading the zero state before anything is written.
let _testSessionStateShouldAllowEmptyObject: SessionState = {};

const CACHED_TASK_NAMES = typesafeUnionMembers<keyof TaskState>({
  tasks: true,
  taskFetchFailureReason: true,
  tasksLastInitiatedFetchTimestamp: true,
  tasksLastCompletedFetchTimestamp: true,
});

export function clearCachedTasks() {
  return SessionState.remove(...CACHED_TASK_NAMES);
}

// No versions and no migrations, unlike the persistent state: onInstalled clears the whole area, so
// anything found here was written by the running version.
export namespace SessionState {
  export async function get(): Promise<SessionState> {
    return (await browser.storage.session.get(null)) as SessionState;
  }

  export function set(state: Partial<SessionState>): Promise<void> {
    return browser.storage.session.set(state);
  }

  export function remove(...keys: (keyof SessionState)[]): Promise<void> {
    return browser.storage.session.remove(keys);
  }

  export function clear(): Promise<void> {
    return browser.storage.session.clear();
  }
}

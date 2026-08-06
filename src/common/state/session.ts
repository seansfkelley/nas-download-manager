import type { SynologyAuthResult, SynologyClientSettings } from "../apis/synology";
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
  auth?: {
    key: SynologyClientSettings;
    result: SynologyAuthResult;
  };
  // Only set when "remember password" is off. Used to re-login while this browser session is still
  // active, which is the what the user would expect even if "remember password" is not set.
  password?: string;
  // Used to control completion notifications. Undefined means no poll was done.
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

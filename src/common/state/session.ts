import type { DownloadStationTask } from "../apis/synology/DownloadStation/Task";

// Split only for convenience; a lot of the frontend does not care one whit about the other fields.
export interface TaskState {
  tasks?: DownloadStationTask[];
  taskFetchFailureReason?: "missing-config" | "login-required" | { failureMessage: string };
  tasksLastInitiatedFetchTimestamp?: number;
  tasksLastCompletedFetchTimestamp?: number;
}

// Other stuff here soon.
export interface SessionState extends TaskState {}

// This means that we don't have to be careful about loading the zero state before anything is written.
let _testSessionStateShouldAllowEmptyObject: SessionState = {};

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

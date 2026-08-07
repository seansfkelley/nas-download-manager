import type { DownloadStationTask } from "../apis/synology/DownloadStation/Task";

// Split only for convenience; a lot of the frontend does not care one whit about the other fields.
export interface TaskState {
  tasks?: DownloadStationTask[];
  taskFetchFailureReason?: "missing-config" | "login-required" | { failureMessage: string };
  tasksLastInitiatedFetchTimestamp?: number;
  tasksLastCompletedFetchTimestamp?: number;
}

export interface SessionState extends TaskState {
  // Identifies the most recently initiated task fetch, so that a fetch can discard its own results
  // if a newer one has started in the meantime.
  latestTaskFetchId?: string;
  // Undefined means we haven't yet seen a task list this session, so there's nothing to compare
  // against to decide which completions are new.
  finishedTaskIds?: string[];
}

// This means that we don't have to be careful about loading the zero state before anything is written.
let _testSessionStateShouldAllowEmptyObject: SessionState = {};

// No versions and no migrations, unlike the persistent state: onInstalled clears the whole area, so
// anything found here was written by the running version.
export namespace SessionState {
  export async function get(): Promise<SessionState> {
    let state = (await browser.storage.session.get(null)) as SessionState;
    console.log("fetched session state");
    return state;
  }

  export async function set(state: Partial<SessionState>): Promise<void> {
    await browser.storage.session.set(state);
    console.log("set session state for keys:", Object.keys(state));
  }

  export async function clear(): Promise<void> {
    await browser.storage.session.clear();
    console.log("cleared session state");
  }
}

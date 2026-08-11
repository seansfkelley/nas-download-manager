import type { SynologyAuth, SynologyClientSettings } from "../apis/synology";
import type { DownloadStationTask } from "../apis/synology/DownloadStation/Task";

// Split only for convenience; a lot of the frontend does not care one whit about the other fields.
export interface TaskState {
  tasks?: DownloadStationTask[];
  taskFetchFailureReason?: "missing-config" | "login-required" | { failureMessage: string };
  tasksLastInitiatedFetchTimestamp?: number;
  tasksLastCompletedFetchTimestamp?: number;
}

export interface SessionState extends TaskState {
  // Set imperatively by the login form when the user opts out of remembering their password, in
  // which case the persistent settings deliberately do not have it.
  password?: string;
  // Tagged with the settings that produced it to detect changes that require reauthorization.
  auth?: { settings: SynologyClientSettings; auth: SynologyAuth };
  // Identifies the most recently initiated task fetch, so that a fetch can discard its own results
  // if a newer one has started in the meantime.
  latestTaskFetchId?: string;
  // Undefined means we haven't yet seen a task list this session, so there's nothing to compare
  // against to decide which completions are new.
  finishedTaskIds?: string[];
}

// This means that we don't have to be careful about loading the zero state before anything is written.
const _testSessionStateShouldAllowEmptyObject: SessionState = {};

// No versions and no migrations, unlike the persistent state: onInstalled clears the whole area, so
// anything found here was written by the running version.
export namespace SessionState {
  export async function get(): Promise<SessionState> {
    const state = (await browser.storage.session.get(null)) as SessionState;
    console.log("fetched session state");
    return state;
  }

  export async function set(state: Partial<SessionState>): Promise<void> {
    await browser.storage.session.set(state);
    console.log("set session state for keys:", Object.keys(state));
  }

  // Unlike setting a key to undefined, this is unambiguously a delete in every browser.
  export async function remove(...keys: (keyof SessionState)[]): Promise<void> {
    await browser.storage.session.remove(keys);
    console.log("removed session state keys:", keys);
  }

  export async function clear(): Promise<void> {
    await browser.storage.session.clear();
    console.log("cleared session state");
  }
}

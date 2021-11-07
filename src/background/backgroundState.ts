import { SynologyClient } from "../common/apis/synology";
import type { Settings } from "../common/state";
import { RequestManager } from "./requestManager";
import type { DownloadStationTask } from "../common/apis/synology/DownloadStation/Task";

export interface BackgroundState {
  api: SynologyClient;
  taskLoadRequestManager: RequestManager;
  settings: Settings;
  lastSettings: Settings | undefined;
  notificationInterval: number | undefined;
  didInitializeSettings: boolean;
  // This starts undefined, which means we haven't fetched the list of tasks yet.
  finishedTaskIds: Set<string> | undefined;
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | { failureMessage: string } | undefined;
  tasksLastInitiatedFetchTimestamp: number | undefined;
  tasksLastCompletedFetchTimestamp: number | undefined;
}

const state: BackgroundState = {
  api: new SynologyClient({}),
  taskLoadRequestManager: new RequestManager(),
  // This is a hack, but we know that the only code that runs before this gets set the first
  // time is thunk-y initialization code that won't read this field.
  settings: (undefined as any) as Settings,
  lastSettings: undefined,
  notificationInterval: undefined,
  didInitializeSettings: false,
  finishedTaskIds: undefined,
  tasks: [],
  taskFetchFailureReason: undefined,
  tasksLastInitiatedFetchTimestamp: undefined,
  tasksLastCompletedFetchTimestamp: undefined,
};

export function getMutableStateSingleton() {
  return state;
}

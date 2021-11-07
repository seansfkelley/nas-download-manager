import { SynologyClient } from "../common/apis/synology";
import type { Settings } from "../common/state";
import type { DownloadStationTask } from "../common/apis/synology/DownloadStation/Task";
import { onChange } from "./state-listeners";

export interface Downloads {
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | { failureMessage: string } | undefined;
  tasksLastInitiatedFetchTimestamp: number | undefined;
  tasksLastCompletedFetchTimestamp: number | undefined;
}

export interface CommonBackgroundState {
  readonly api: SynologyClient;
  readonly settings: Settings;
  readonly downloads: Readonly<Downloads>;
}

const state: CommonBackgroundState = {
  api: new SynologyClient({}),
  // This is a hack, but we know that the only code that runs before this gets set the first time is
  // thunk-y initialization code that won't read this field. It's much more convenient if we can
  // keep the type non-null.
  settings: (undefined as any) as Settings,
  downloads: {
    tasks: [],
    taskFetchFailureReason: undefined,
    tasksLastInitiatedFetchTimestamp: undefined,
    tasksLastCompletedFetchTimestamp: undefined,
  },
};

export function updateStateSingleton(updates: Partial<CommonBackgroundState>) {
  Object.assign(state, updates);
  onChange(state);
}

export function getReadonlyStateSingleton() {
  return state;
}

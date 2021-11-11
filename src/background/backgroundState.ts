import { SynologyClient } from "../common/apis/synology";
import type { Settings } from "../common/state";
import type { DownloadStationTask } from "../common/apis/synology/DownloadStation/Task";
import { onChangeSettings, onChangeState } from "./listeners";

export interface Downloads {
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | { failureMessage: string } | undefined;
  tasksLastInitiatedFetchTimestamp: number | undefined;
  tasksLastCompletedFetchTimestamp: number | undefined;
}

export interface MutableContextContainer {
  get: <T>(key: unknown, initial: T) => T;
}

export interface BackgroundState {
  // Note that this isn't readonly. Nobody should be listening to changes to this; the way that it's
  // used, the intent is that changes to its settings transparently take effect next time it's needed.
  readonly api: SynologyClient;
  readonly settings: Readonly<Settings>;
  readonly downloads: Readonly<Downloads>;
  readonly updateSettings: (settings: Settings) => void;
  readonly updateDownloads: (downloads: Partial<Downloads>) => void;
  readonly contextContainer: MutableContextContainer;
}

const state: BackgroundState = {
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
  updateSettings(settings: Settings): void {
    // Assign this way to guarantee the reference is stable.
    Object.assign(state.settings, settings);

    // Intercept requested changes to downloads, but since these handlers aren't allowed to read
    // downloads, defer their application all at once, then call the readonly handlers once at the
    // end. This will produce less churn and fewer weird intermediate states than if we passed the
    // main implementation of updateDownloads along instead.
    const downloadChanges: Partial<Downloads> = {};
    function updateDownloads(downloads: Partial<Downloads>) {
      Object.assign(downloadChanges, downloads);
    }
    onChangeSettings(state.settings, state.api, updateDownloads, state.contextContainer);
    Object.assign(state.downloads, downloadChanges);
    onChangeState(state.settings, state.downloads, state.contextContainer);
  },
  updateDownloads(downloads: Partial<Downloads>): void {
    // Assign this way to guarantee the reference is stable.
    Object.assign(state.downloads, downloads);
    onChangeState(state.settings, state.downloads, state.contextContainer);
  },
  contextContainer: contextContainer(),
};

function contextContainer(): MutableContextContainer {
  const storage = new Map<any, any>();
  return {
    get: (key, initial) => {
      if (!storage.has(key)) {
        storage.set(key, initial);
      }
      return storage.get(key);
    },
  };
}

export function getStateSingleton() {
  return state;
}

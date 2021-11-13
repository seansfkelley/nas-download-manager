import type { Downloads } from "../common/apis/messages";
import { SynologyClient } from "../common/apis/synology";
import { assert, DeepReadonly } from "../common/lang";
import type { Settings } from "../common/state";
import { notifyListeners } from "./listeners/registry";

// All attributes are guaranteed to stay reference-equal, so you can destructure getStateSingleton()
// and use the results across `await` boundaries safely, as long as there's only one level of
// destructuring/keeping references to values. The values are still readonly, however -- the update
// methods must be used to guarantee reference stability and to call listeners.
export interface BackgroundState {
  // Note that this isn't readonly. Nobody should be listening to changes to this; the way that it's
  // used, the intent is that changes to its settings transparently take effect next time it's needed.
  readonly api: SynologyClient;
  readonly settings: DeepReadonly<Settings>;
  readonly downloads: DeepReadonly<Downloads>;
  readonly updateSettings: (settings: Settings) => void;
  readonly updateDownloads: (downloads: Partial<Downloads>) => void;
}

let isUpdatingSettings = false;
let isUpdatingDownloads = false;

const state: BackgroundState = {
  api: new SynologyClient({}),
  // This is a hack, but we know that the only code that runs before this gets set the first time is
  // thunk-y initialization code that won't read this field. It's much more convenient if we can
  // keep the type as if it's always got all the fields.
  settings: ({} as any) as Settings,
  downloads: {
    tasks: [],
    taskFetchFailureReason: undefined,
    tasksLastInitiatedFetchTimestamp: undefined,
    tasksLastCompletedFetchTimestamp: undefined,
  },
  updateSettings(settings: Settings): void {
    assert(!isUpdatingSettings, "listener loop: settings");
    Object.assign(state.settings, settings);
    isUpdatingSettings = true;
    notifyListeners("settings");
    isUpdatingSettings = false;
  },
  updateDownloads(downloads: Partial<Downloads>): void {
    assert(!isUpdatingDownloads, "listener loop: settings");
    Object.assign(state.downloads, downloads);
    isUpdatingDownloads = true;
    notifyListeners("downloads");
    isUpdatingDownloads = false;
  },
};

export function getStateSingleton() {
  return state;
}

(window as any).getStateSingleton = getStateSingleton;

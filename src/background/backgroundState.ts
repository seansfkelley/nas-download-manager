import { SynologyClient } from "../common/apis/synology";

export interface BackgroundState {
  api: SynologyClient;
  // This starts undefined, which means we haven't fetched the list of tasks yet.
  finishedTaskIds: Set<string> | undefined;
  showNonErrorNotifications: boolean;
  isInitializingExtension: boolean;
}

const state: BackgroundState = {
  api: new SynologyClient({}),
  finishedTaskIds: undefined,
  showNonErrorNotifications: true,
  isInitializingExtension: true,
};

export function getMutableStateSingleton() {
  return state;
}

(window as any).getMutableStateSingleton = getMutableStateSingleton;

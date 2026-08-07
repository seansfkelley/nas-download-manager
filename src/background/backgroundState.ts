import { SynologyClient } from "../common/apis/synology";

export interface BackgroundState {
  api: SynologyClient;
}

const state: BackgroundState = {
  api: new SynologyClient({}),
};

export function getMutableStateSingleton() {
  return state;
}

(window as any).getMutableStateSingleton = getMutableStateSingleton;

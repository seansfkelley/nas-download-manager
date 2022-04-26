import { SynologyClient } from "../common/apis/synology";
import type { NotificationSettings } from "../common/state";
import { RequestManager } from "./requestManager";

export interface BackgroundState {
  api: SynologyClient;
  // This starts undefined, which means we haven't fetched the list of tasks yet.
  finishedTaskIds: Set<string> | undefined;
  pollRequestManager: RequestManager;
  lastNotificationSettings: NotificationSettings | undefined;
  notificationInterval: number | undefined;
  showNonErrorNotifications: boolean;
  isInitializingExtension: boolean;
  interceptExtensions: string,
}

const state: BackgroundState = {
  api: new SynologyClient({}),
  finishedTaskIds: undefined,
  pollRequestManager: new RequestManager(),
  lastNotificationSettings: undefined,
  notificationInterval: undefined,
  showNonErrorNotifications: true,
  isInitializingExtension: true,
  interceptExtensions: '',
};

export function getMutableStateSingleton() {
  return state;
}

(window as any).getMutableStateSingleton = getMutableStateSingleton;

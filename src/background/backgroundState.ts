import { ApiClient } from "synology-typescript-api";
import type { NotificationSettings } from "../common/state";

export interface BackgroundState {
  api: ApiClient;
  // This starts undefined, which means we haven't fetched the list of tasks yet.
  finishedTaskIds: Set<string> | undefined;
  lastNotificationSettings: NotificationSettings | undefined;
  notificationInterval: number | undefined;
  didInitializeSettings: boolean;
  showNonErrorNotifications: boolean;
}

const state: BackgroundState = {
  api: new ApiClient({}),
  finishedTaskIds: undefined,
  lastNotificationSettings: undefined,
  notificationInterval: undefined,
  didInitializeSettings: false,
  showNonErrorNotifications: true
}

export function getMutableStateSingleton() {
  return state;
}

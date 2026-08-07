import { SynologyClient } from "../common/apis/synology";
import type { NotificationSettings } from "../common/state";

export interface BackgroundState {
  api: SynologyClient;
  lastNotificationSettings: NotificationSettings | undefined;
  notificationInterval: number | undefined;
}

const state: BackgroundState = {
  api: new SynologyClient({}),
  lastNotificationSettings: undefined,
  notificationInterval: undefined,
};

export function getMutableStateSingleton() {
  return state;
}

(window as any).getMutableStateSingleton = getMutableStateSingleton;

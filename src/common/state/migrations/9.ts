import type { OmitStrict } from "../../types";

import type {
  State as State_8,
  Settings as Settings_8,
  NotificationSettings as NotificationSettings_8,
} from "./8";

export {
  VisibleTaskSettings,
  TaskSortType,
  CachedTasks,
  Logging,
  BadgeDisplayType,
  Protocol,
  ConnectionSettings,
} from "./8";

export interface StateVersion {
  stateVersion: 9;
}

export type NotificationSettings = OmitStrict<NotificationSettings_8, "completionPollingInterval">;

export interface Settings extends OmitStrict<Settings_8, "notifications"> {
  notifications: NotificationSettings;
}

export interface State extends StateVersion, OmitStrict<State_8, "settings" | "stateVersion"> {
  settings: Settings;
}

export function migrate(state: State_8): State {
  const { completionPollingInterval, ...notifications } = state.settings.notifications;
  return {
    ...state,
    stateVersion: 9,
    settings: {
      ...state.settings,
      notifications,
    },
  };
}

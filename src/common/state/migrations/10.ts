import { typesafeOmit } from "../../lang";
import type { OmitStrict } from "../../types";

import type {
  State as State_9,
  Settings as Settings_9,
  NotificationSettings as NotificationSettings_9,
} from "./9";

export {
  VisibleTaskSettings,
  TaskSortType,
  Logging,
  BadgeDisplayType,
  ConnectionSettings,
  Protocol,
} from "./9";

export interface StateVersion {
  stateVersion: 10;
}

export interface NotificationSettings extends OmitStrict<
  NotificationSettings_9,
  "completionPollingInterval"
> {}

export interface Settings extends OmitStrict<Settings_9, "notifications"> {
  notifications: NotificationSettings;
}

export interface State extends StateVersion, OmitStrict<State_9, "settings" | "stateVersion"> {
  settings: Settings;
}

export function migrate(state: State_9): State {
  return {
    ...state,
    stateVersion: 10,
    settings: {
      ...state.settings,
      notifications: typesafeOmit(state.settings.notifications, "completionPollingInterval"),
    },
  };
}

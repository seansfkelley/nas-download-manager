import type { OmitStrict } from "../../types";

import type {
  State as State_7,
  Settings as Settings_7,
  ConnectionSettings as ConnectionSettings_7,
} from "./7";

export {
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  CachedTasks,
  Logging,
  BadgeDisplayType,
} from "./7";

export interface StateVersion {
  stateVersion: 8;
}

export type Protocol = "http" | "https";

export interface ConnectionSettings extends ConnectionSettings_7 {
  protocol: Protocol;
}

export interface Settings extends OmitStrict<Settings_7, "connection"> {
  connection: ConnectionSettings;
}

export interface State extends StateVersion, OmitStrict<State_7, "settings" | "stateVersion"> {
  settings: Settings;
}

export function migrate(state: State_7): State {
  return {
    ...state,
    stateVersion: 8,
    settings: {
      ...state.settings,
      connection: {
        ...state.settings.connection,
        // Versions 6 and 7 hardcoded HTTPS, so that's what any existing connection is using.
        protocol: "https",
      },
    },
  };
}

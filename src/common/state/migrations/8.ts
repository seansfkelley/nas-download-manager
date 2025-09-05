import type { OmitStrict } from "../../types";

import type { State as State_7, Settings as Settings_7 } from "./7";

export {
  VisibleTaskSettings,
  TaskSortType,
  CachedTasks,
  NotificationSettings,
  Logging,
  BadgeDisplayType,
} from "./7";

export interface StateVersion {
  stateVersion: 8;
}

export interface ConnectionSettings {
  hostname: string;
  port: number;
  username: string;
  password: string | undefined;
  rememberPassword: boolean;
  otpCode: string;
  deviceId: string;
  deviceName: string;
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
        otpCode: "",
        deviceId: "",
        deviceName: "",
      },
    },
  };
}

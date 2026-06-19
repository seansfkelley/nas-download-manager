import type { OmitStrict } from "../../types";

import type { State as State_7, Settings as Settings_7, ConnectionSettings as ConnectionSettings_7 } from "./7";

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

export interface ConnectionSettings extends ConnectionSettings_7 {
  // The device token ("did") DSM returns when you log in with enable_device_token=yes after
  // passing a 2FA one-time-password. Presenting it on later logins lets us skip the OTP prompt.
  // Undefined when 2FA is off or this device hasn't been remembered yet.
  rememberedDeviceToken: string | undefined;
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
        rememberedDeviceToken: undefined,
      },
    },
  };
}

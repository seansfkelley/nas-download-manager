import type { OmitStrict } from "../../types";

import type {
  ConnectionSettings as ConnectionSettings_10,
  Settings as Settings_10,
  State as State_10,
} from "./10";

export {
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  Logging,
  BadgeDisplayType,
  Protocol,
} from "./10";

export interface StateVersion {
  stateVersion: 11;
}

export interface ConnectionSettings extends ConnectionSettings_10 {
  // The device token DSM issues when logging in with a one-time password. Sending it back in place
  // of that password is what keeps two-step verification to a single prompt. Undefined when the
  // account has no two-step verification, or when this device hasn't been remembered yet.
  deviceToken: string | undefined;
}

export interface Settings extends OmitStrict<Settings_10, "connection"> {
  connection: ConnectionSettings;
}

export interface State extends StateVersion, OmitStrict<State_10, "settings" | "stateVersion"> {
  settings: Settings;
}

export function migrate(state: State_10): State {
  return {
    ...state,
    stateVersion: 11,
    settings: {
      ...state.settings,
      connection: {
        ...state.settings.connection,
        deviceToken: undefined,
      },
    },
  };
}

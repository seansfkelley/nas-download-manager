import type { OmitStrict } from "../../types";

import type { Protocol, Settings as Settings_10, State as State_10 } from "./10";

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

export interface ConnectionIdentifiers {
  protocol: Protocol;
  hostname: string;
  port: number;
  username: string;
}

export interface ConnectionSecrets {
  password: string;
  // Device tokens take the place of OTP, so re-authentication with 2FA configured does not require
  // the user to enter a OTP every time.
  deviceToken: string | undefined;
}

export interface ConnectionSettings {
  identifiers: ConnectionIdentifiers;
  secrets: ConnectionSecrets | undefined;
  rememberSecrets: boolean;
}

export interface Settings extends OmitStrict<Settings_10, "connection"> {
  connection: ConnectionSettings;
}

export interface State extends StateVersion, OmitStrict<State_10, "settings" | "stateVersion"> {
  settings: Settings;
}

export function migrate(state: State_10): State {
  const { connection } = state.settings;
  return {
    ...state,
    stateVersion: 11,
    settings: {
      ...state.settings,
      connection: {
        identifiers: {
          protocol: connection.protocol,
          hostname: connection.hostname,
          port: connection.port,
          username: connection.username,
        },
        secrets: connection.password
          ? { password: connection.password, deviceToken: undefined }
          : undefined,
        rememberSecrets: connection.rememberPassword,
      },
    },
  };
}

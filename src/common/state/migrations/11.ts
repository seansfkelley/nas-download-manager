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

// Everything needed to address the NAS, none of which is secret.
export interface ConnectionIdentifiers {
  protocol: Protocol;
  hostname: string;
  port: number;
  username: string;
}

export interface ConnectionSecrets {
  password: string;
  // The device token DSM issues when logging in with a one-time password. Sending it back in place
  // of that password is what keeps two-step verification to a single prompt. Undefined when the
  // account has no two-step verification, or when this device hasn't been remembered yet.
  deviceToken: string | undefined;
}

export interface ConnectionSettings {
  identifiers: ConnectionIdentifiers;
  // Absent when there is nothing to log in with yet, and when the user asked us not to remember it,
  // in which case it lives in session state for as long as the browser is running.
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

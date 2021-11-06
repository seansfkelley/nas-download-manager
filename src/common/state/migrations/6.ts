import { typesafeOmit } from "../../lang";

import type { State as State_5, CachedTasks as CachedTasks_5, Settings as Settings_5 } from "./5";

export {
  VisibleTaskSettings,
  TaskSortType,
  CachedTasks,
  NotificationSettings,
  BadgeDisplayType,
} from "./5";

export interface StateVersion {
  stateVersion: 6;
}

export interface Logging {
  lastSevereError: string | undefined;
}

export interface ConnectionSettings {
  hostname: string;
  port: number;
  username: string;
  password: string | undefined;
  rememberPassword: boolean;
}

export interface Settings extends Omit<Settings_5, "connection"> {
  connection: ConnectionSettings;
}

export interface State extends CachedTasks_5, Logging, StateVersion {
  settings: Settings;
}

export function migrate(state: State_5): State {
  return {
    ...state,
    stateVersion: 6,
    settings: {
      ...state.settings,
      connection: {
        // This isn't super necessary because we could just ignore it, but I like to keep a clean house.
        ...typesafeOmit(state.settings.connection, "protocol"),
        rememberPassword: true,
      },
    },
  };
}

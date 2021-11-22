// TODO: This should re-define the properties that are interesting on the type, otherwise
// this migration is not safe from changes made to the imported typed in the future.
import type { DownloadStationTask } from "../../apis/synology/DownloadStation/Task";
import { typesafeOmit } from "../../lang";
import type { OmitStrict } from "../../types";

import type { State as State_5, Settings as Settings_5 } from "./5";

export { VisibleTaskSettings, TaskSortType, NotificationSettings, BadgeDisplayType } from "./5";

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

export interface CachedTasks {
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | "login-required" | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
}

export interface Settings extends OmitStrict<Settings_5, "connection"> {
  connection: ConnectionSettings;
}

export interface State extends CachedTasks, Logging, StateVersion {
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

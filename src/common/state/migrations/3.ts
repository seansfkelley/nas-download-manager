import { migrate as migrate_1 } from "./1";

import {
  State as State_2,
  CachedTasks as CachedTasks_2,
  Settings as Settings_2,
  Logging as Logging_2,
  migrate as migrate_2,
} from "./2";

export {
  Protocol,
  VisibleTaskSettings,
  TaskSortType,
  CachedTasks,
  NotificationSettings,
  Settings,
  ConnectionSettings,
  Logging,
} from "./2";

export interface StateVersion {
  stateVersion: 3;
}

export interface State extends Settings_2, CachedTasks_2, Logging_2, StateVersion {}

export function migrate(state: State_2): State {
  state = {
    ...migrate_2(migrate_1(null)),
    ...state,
  };
  delete (state as any).cachedTasksVersion;
  return {
    ...state,
    lastSevereError: undefined,
    stateVersion: 3,
  };
}

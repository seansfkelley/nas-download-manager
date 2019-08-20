import { state0to1 } from "./1";

import {
  State as State_2,
  CachedTasks as CachedTasks_2,
  Settings as Settings_2,
  Logging as Logging_2,
  state1to2,
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

export function transition(state: State_2): State {
  state = {
    ...state1to2(state0to1(null)),
    ...state,
  };
  delete (state as any).cachedTasksVersion;
  return {
    ...state,
    lastSevereError: undefined,
    stateVersion: 3,
  };
}

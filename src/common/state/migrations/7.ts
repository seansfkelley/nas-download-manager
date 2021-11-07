import type { State as State_6, Settings as Settings_6, Logging as Logging_6 } from "./6";

export {
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  BadgeDisplayType,
  Settings,
  ConnectionSettings,
  Logging,
} from "./6";

export interface StateVersion {
  stateVersion: 7;
}

export interface State extends Logging_6, StateVersion {
  settings: Settings_6;
}

export function migrate(state: State_6): State {
  const mutableState = { ...state } as Partial<State_6>;
  delete mutableState.taskFetchFailureReason;
  delete mutableState.tasks;
  delete mutableState.tasksLastCompletedFetchTimestamp;
  delete mutableState.tasksLastInitiatedFetchTimestamp;
  return {
    ...(mutableState as Required<State_6>),
    stateVersion: 7,
  };
}

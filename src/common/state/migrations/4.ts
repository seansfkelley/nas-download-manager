import type {
  State as State_3,
  CachedTasks as CachedTasks_3,
  Settings as Settings_3,
  Logging as Logging_3,
} from "./3";

export {
  Protocol,
  VisibleTaskSettings,
  TaskSortType,
  CachedTasks,
  NotificationSettings,
  ConnectionSettings,
  Logging,
} from "./3";

export type BadgeDisplayType = "total" | "filtered";

export interface StateVersion {
  stateVersion: 4;
}

export interface Settings extends Settings_3 {
  badgeDisplayType: BadgeDisplayType;
}

export interface State extends Settings, CachedTasks_3, Logging_3, StateVersion {}

export function migrate(state: State_3): State {
  return {
    ...state,
    badgeDisplayType: "total",
    lastSevereError: undefined,
    stateVersion: 4,
  };
}

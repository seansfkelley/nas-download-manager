import { typesafeUnionMembers, typesafeOmit, typesafePick } from "../lang";

import type {
  State as State_4,
  CachedTasks as CachedTasks_4,
  Logging as Logging_4,
  Settings as Settings_4,
} from "./4";

export {
  Protocol,
  VisibleTaskSettings,
  TaskSortType,
  CachedTasks,
  NotificationSettings,
  ConnectionSettings,
  Logging,
  Settings,
} from "./4";

export type BadgeDisplayType = "total" | "filtered";

export interface StateVersion {
  stateVersion: 5;
}

export interface State extends CachedTasks_4, Logging_4, StateVersion {
  settings: Settings_4;
}

const SETTINGS_KEYS = typesafeUnionMembers<keyof Settings_4>({
  badgeDisplayType: true,
  connection: true,
  visibleTasks: true,
  taskSortType: true,
  notifications: true,
  shouldHandleDownloadLinks: true,
});

export function transition(state: State_4): State {
  return {
    ...typesafeOmit(state, ...SETTINGS_KEYS),
    settings: typesafePick(state, ...SETTINGS_KEYS),
    lastSevereError: undefined,
    stateVersion: 5,
  };
}

import type { OmitStrict } from "../../types";

import type { State as State_6, Settings as Settings_6 } from "./6";

export {
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  CachedTasks,
  ConnectionSettings,
  Logging,
} from "./6";

export interface StateVersion {
  stateVersion: 7;
}

export type BadgeDisplayType = "total" | "filtered" | "completed";

export interface Settings extends OmitStrict<Settings_6, "badgeDisplayType"> {
  badgeDisplayType: BadgeDisplayType;
  showInactiveTasks: boolean;
}

export interface State extends StateVersion, OmitStrict<State_6, "settings" | "stateVersion"> {
  settings: Settings;
}

export function migrate(state: State_6): State {
  return {
    ...state,
    stateVersion: 7,
    settings: {
      ...state.settings,
      showInactiveTasks: true,
    },
  };
}

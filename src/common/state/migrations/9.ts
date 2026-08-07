import { typesafeOmit } from "../../lang";
import type { OmitStrict } from "../../types";

import type { State as State_8 } from "./8";

export {
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  Logging,
  BadgeDisplayType,
  Settings,
  ConnectionSettings,
  Protocol,
} from "./8";

export interface StateVersion {
  stateVersion: 9;
}

export interface State
  extends
    StateVersion,
    OmitStrict<
      State_8,
      | "stateVersion"
      | "tasks"
      | "taskFetchFailureReason"
      | "tasksLastCompletedFetchTimestamp"
      | "tasksLastInitiatedFetchTimestamp"
    > {}

export function migrate(state: State_8): State {
  return {
    ...typesafeOmit(
      state,
      "tasks",
      "taskFetchFailureReason",
      "tasksLastCompletedFetchTimestamp",
      "tasksLastInitiatedFetchTimestamp",
    ),
    stateVersion: 9,
  };
}

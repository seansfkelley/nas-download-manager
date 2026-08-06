import type { OmitStrict } from "../../types";
import { typesafeOmit } from "../../lang";

import type { State as State_9, CachedTasks as CachedTasks_9 } from "./9";

export {
  VisibleTaskSettings,
  TaskSortType,
  NotificationSettings,
  Settings,
  Logging,
  BadgeDisplayType,
  Protocol,
  ConnectionSettings,
} from "./9";

export interface StateVersion {
  stateVersion: 10;
}

// The cached tasks live in storage.session now. They are dropped rather than moved, because the
// next poll refills them and the session area is empty at this point anyway.
export interface State
  extends StateVersion, OmitStrict<State_9, "stateVersion" | keyof CachedTasks_9> {}

export function migrate(state: State_9): State {
  return {
    ...typesafeOmit(
      state,
      "tasks",
      "taskFetchFailureReason",
      "tasksLastInitiatedFetchTimestamp",
      "tasksLastCompletedFetchTimestamp",
    ),
    stateVersion: 10,
  };
}

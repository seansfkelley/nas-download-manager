import { DownloadStationTask } from "synology-typescript-api";
import { Omit } from "../lang";
import { state0to1 } from "./1";

export { Protocol_1, VisibleTaskSettings_1, TaskSortType_1, ConnectionSettings_1 } from "./1";

import { State_1, ConnectionSettings_1, VisibleTaskSettings_1, TaskSortType_1 } from "./1";

export interface NotificationSettings_2 {
  enableFeedbackNotifications: boolean;
  enableCompletionNotifications: boolean;
  completionPollingInterval: number;
}

export interface Settings_2 {
  connection: ConnectionSettings_1;
  visibleTasks: VisibleTaskSettings_1;
  taskSortType: TaskSortType_1;
  notifications: NotificationSettings_2;
  shouldHandleDownloadLinks: boolean;
}

export interface CachedTasks_2 {
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
}

export interface Logging_2 {
  lastSevereError: any | undefined;
}

export interface StateVersion_2 {
  stateVersion: 2;
}

export interface State_2 extends Settings_2, CachedTasks_2, Logging_2, StateVersion_2 {}

export function state1to2(state: State_1): State_2 {
  state = {
    ...state0to1(null),
    ...state,
  };
  delete state.cachedTasksVersion;
  return {
    ...(state as Omit<State_1, "cachedTasksVersion">),
    // Clear tasks as we changed the shape of the request.
    tasks: [],
    taskFetchFailureReason: null,
    tasksLastInitiatedFetchTimestamp: null,
    tasksLastCompletedFetchTimestamp: null,
    notifications: {
      enableFeedbackNotifications: true,
      enableCompletionNotifications: state.notifications.enabled,
      completionPollingInterval: state.notifications.pollingInterval,
    },
    lastSevereError: undefined,
    stateVersion: 2,
  };
}

import type { DownloadStationTask } from "synology-typescript-api";

import {
  transition as transition_1,
  State as State_1,
  ConnectionSettings as ConnectionSettings_1,
  VisibleTaskSettings as VisibleTaskSettings_1,
  TaskSortType as TaskSortType_1,
} from "./1";

export { Protocol, VisibleTaskSettings, TaskSortType, ConnectionSettings } from "./1";

export interface NotificationSettings {
  enableFeedbackNotifications: boolean;
  enableCompletionNotifications: boolean;
  completionPollingInterval: number;
}

export interface Settings {
  connection: ConnectionSettings_1;
  visibleTasks: VisibleTaskSettings_1;
  taskSortType: TaskSortType_1;
  notifications: NotificationSettings;
  shouldHandleDownloadLinks: boolean;
}

export interface CachedTasks {
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
}

export interface Logging {
  lastSevereError: any | undefined;
}

export interface StateVersion {
  stateVersion: 2;
}

export interface State extends Settings, CachedTasks, Logging, StateVersion {}

export function transition(state: State_1): State {
  state = {
    ...transition_1(null),
    ...state,
  };
  delete (state as Omit<State_1, "cachedTasksVersion"> & { cachedTasksVersion?: unknown })
    .cachedTasksVersion;
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

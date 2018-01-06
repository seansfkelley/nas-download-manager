export {
  Protocol_1,
  VisibleTaskSettings_1,
  TaskSortType_1,
  CachedTasks_1,
  ConnectionSettings_1,
} from './1';

import {
  State_1,
  ConnectionSettings_1,
  VisibleTaskSettings_1,
  TaskSortType_1,
  CachedTasks_1,
 } from './1';

export interface NotificationSettings_2 {
  enableFeedbackNotifications: boolean,
  enableCompletionNotifications: boolean,
  completionPollingInterval: number,
}

export interface Settings_2 {
  connection: ConnectionSettings_1;
  visibleTasks: VisibleTaskSettings_1;
  taskSortType: TaskSortType_1;
  notifications: NotificationSettings_2;
  shouldHandleDownloadLinks: boolean;
}

export interface State_2 extends Settings_2, CachedTasks_1 {}

export function state1to2(state: State_1): State_2 {
  return {
    ...state,
    // Clear tasks as we changed the shape of the request.
    tasks: [],
    taskFetchFailureReason: null,
    tasksLastInitiatedFetchTimestamp: null,
    tasksLastCompletedFetchTimestamp: null,
    notifications: {
      enableFeedbackNotifications: true,
      enableCompletionNotifications: state.notifications.enabled,
      completionPollingInterval: state.notifications.pollingInterval,
    }
  };
}

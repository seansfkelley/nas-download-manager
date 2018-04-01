import { DownloadStationTask } from 'synology-typescript-api';

export type Protocol_1 = 'http' | 'https';

export interface ConnectionSettings_1 {
  protocol: Protocol_1;
  hostname: string;
  port: number;
  username: string;
  password: string;
}

export interface VisibleTaskSettings_1 {
  downloading: boolean;
  uploading: boolean;
  completed: boolean;
  errored: boolean;
  other: boolean;
}

export interface NotificationSettings_1 {
  enabled: boolean;
  pollingInterval: number;
}

export type TaskSortType_1 = 'name-asc' | 'name-desc' | 'timestamp-completed-asc' | 'timestamp-completed-desc' | 'timestamp-added-asc' | 'timestamp-added-desc' | 'completed-percent-asc' | 'completed-percent-desc';

export interface Settings_1 {
  connection: ConnectionSettings_1;
  visibleTasks: VisibleTaskSettings_1;
  taskSortType: TaskSortType_1;
  notifications: NotificationSettings_1;
  shouldHandleDownloadLinks: boolean;
}

export interface CachedTasks_1 {
  cachedTasksVersion: number;
  tasks: DownloadStationTask[];
  taskFetchFailureReason: 'missing-config' | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
}

export interface StateVersion_1 {
  stateVersion: 1;
}

export interface State_1 extends Settings_1, CachedTasks_1, StateVersion_1 {}

export function state0to1(_state: null | undefined): State_1 {
  return {
    connection: {
      protocol: 'https',
      hostname: '',
      port: 5001,
      username: '',
      password: '',
    },
    visibleTasks: {
      downloading: true,
      uploading: true,
      completed: true,
      errored: true,
      other: true,
    },
    taskSortType: 'name-asc',
    notifications: {
      enabled: false,
      pollingInterval: 60
    },
    shouldHandleDownloadLinks: true,
    cachedTasksVersion: 1,
    tasks: [],
    taskFetchFailureReason: null,
    tasksLastInitiatedFetchTimestamp: null,
    tasksLastCompletedFetchTimestamp: null,
    stateVersion: 1,
  };
}

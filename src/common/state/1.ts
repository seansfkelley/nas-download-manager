import type { DownloadStationTask } from "synology-typescript-api";

export type Protocol = "http" | "https";

export interface ConnectionSettings {
  protocol: Protocol;
  hostname: string;
  port: number;
  username: string;
  password: string;
}

export interface VisibleTaskSettings {
  downloading: boolean;
  uploading: boolean;
  completed: boolean;
  errored: boolean;
  other: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  pollingInterval: number;
}

export type TaskSortType =
  | "name-asc"
  | "name-desc"
  | "timestamp-completed-asc"
  | "timestamp-completed-desc"
  | "timestamp-added-asc"
  | "timestamp-added-desc"
  | "completed-percent-asc"
  | "completed-percent-desc";

export interface TorrentTrackerSettings {
  enablePublicTrackers: boolean;
  publicTrackerURL: string;
}

export interface Settings {
  connection: ConnectionSettings;
  visibleTasks: VisibleTaskSettings;
  taskSortType: TaskSortType;
  notifications: NotificationSettings;
  shouldHandleDownloadLinks: boolean;
  torrentTrackers: TorrentTrackerSettings;
}

export interface CachedTasks {
  cachedTasksVersion: number;
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
}

export interface StateVersion {
  stateVersion: 1;
}

export interface State extends Settings, CachedTasks, StateVersion {}

export function transition(_state: null | undefined): State {
  return {
    connection: {
      protocol: "https",
      hostname: "",
      port: 5001,
      username: "",
      password: "",
    },
    visibleTasks: {
      downloading: true,
      uploading: true,
      completed: true,
      errored: true,
      other: true,
    },
    taskSortType: "name-asc",
    notifications: {
      enabled: false,
      pollingInterval: 60,
    },
    shouldHandleDownloadLinks: true,
    torrentTrackers: {
      enablePublicTrackers: false,
      publicTrackerURL: "",
    },
    cachedTasksVersion: 1,
    tasks: [],
    taskFetchFailureReason: null,
    tasksLastInitiatedFetchTimestamp: null,
    tasksLastCompletedFetchTimestamp: null,
    stateVersion: 1,
  };
}

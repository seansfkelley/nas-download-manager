import type { DownloadStationTask } from "../apis/synology/DownloadStation/Task";
import { typesafeMapValues } from "../lang";

export const BUG_REPORT_URL = "https://github.com/smolyn/nas-download-manager-v7/issues/new";

export const STATE_VERSION = 1;

export interface ConnectionSettings {
  hostname: string;
  port: number;
  username: string;
  password: string | undefined;
  rememberPassword: boolean;
}

export interface VisibleTaskSettings {
  downloading: boolean;
  uploading: boolean;
  completed: boolean;
  errored: boolean;
  other: boolean;
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

export interface NotificationSettings {
  enableFeedbackNotifications: boolean;
  enableCompletionNotifications: boolean;
  completionPollingInterval: number;
}

export type BadgeDisplayType = "total" | "filtered" | "completed";

export interface Settings {
  connection: ConnectionSettings;
  visibleTasks: VisibleTaskSettings;
  taskSortType: TaskSortType;
  notifications: NotificationSettings;
  shouldHandleDownloadLinks: boolean;
  badgeDisplayType: BadgeDisplayType;
  showInactiveTasks: boolean;
}

export interface State {
  stateVersion: number;
  settings: Settings;
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | "login-required" | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
  lastSevereError: string | undefined;
}

export const DEFAULT_STATE: State = {
  stateVersion: STATE_VERSION,
  settings: {
    connection: {
      hostname: "",
      port: 5001,
      username: "",
      password: undefined,
      rememberPassword: true,
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
      enableFeedbackNotifications: false,
      enableCompletionNotifications: false,
      completionPollingInterval: 60,
    },
    shouldHandleDownloadLinks: true,
    badgeDisplayType: "total",
    showInactiveTasks: true,
  },
  tasks: [],
  taskFetchFailureReason: "missing-config",
  tasksLastInitiatedFetchTimestamp: null,
  tasksLastCompletedFetchTimestamp: null,
  lastSevereError: undefined,
};

export function getHostUrl(settings: ConnectionSettings) {
  if (settings.hostname && settings.port) {
    return `https://${settings.hostname}:${settings.port}`;
  } else {
    return undefined;
  }
}

function lazyRecord<K extends string>(init: () => Record<K, string>): Record<K, string> {
  let cached: Record<K, string> | undefined;
  return new Proxy({} as Record<K, string>, {
    get(_, key: string) {
      cached ??= init();
      return cached[key as K];
    },
    ownKeys() {
      cached ??= init();
      return Object.keys(cached);
    },
    getOwnPropertyDescriptor(_, key) {
      cached ??= init();
      if (key in cached) return { configurable: true, enumerable: true, value: cached[key as K] };
      return undefined;
    },
  });
}

export const ORDERED_VISIBLE_TASK_TYPE_NAMES: Record<keyof VisibleTaskSettings, string> =
  lazyRecord(() => ({
    downloading: browser.i18n.getMessage("Downloading"),
    uploading: browser.i18n.getMessage("Completed_uploading"),
    completed: browser.i18n.getMessage("Completed_not_uploading"),
    errored: browser.i18n.getMessage("Errored"),
    other: browser.i18n.getMessage("Other"),
  }));

export const ORDERED_TASK_SORT_TYPE_NAMES: Record<TaskSortType, string> = lazyRecord(() => ({
  "name-asc": browser.i18n.getMessage("name_AZ"),
  "name-desc": browser.i18n.getMessage("name_ZA"),
  "timestamp-added-desc": browser.i18n.getMessage("date_added_newest_first"),
  "timestamp-added-asc": browser.i18n.getMessage("date_added_oldest_first"),
  "timestamp-completed-desc": browser.i18n.getMessage("date_completed_newest_first"),
  "timestamp-completed-asc": browser.i18n.getMessage("date_completed_oldest_first"),
  "completed-percent-asc": browser.i18n.getMessage("_complete_least_first"),
  "completed-percent-desc": browser.i18n.getMessage("_complete_most_first"),
}));

export const ORDERED_BADGE_DISPLAY_TYPE_NAMES: Record<BadgeDisplayType, string> = lazyRecord(
  () => ({
    total: browser.i18n.getMessage("total_task_count"),
    filtered: browser.i18n.getMessage("filtered_task_count"),
    completed: browser.i18n.getMessage("completed_task_count"),
  }),
);

export function redactState(state: State): object {
  const sanitizedConnection: Record<keyof ConnectionSettings, boolean> = {
    ...typesafeMapValues(state.settings.connection, Boolean),
  };

  return {
    ...state,
    settings: {
      ...state.settings,
      connection: sanitizedConnection,
    },
    lastSevereError: state.lastSevereError ? "(omitted for brevity)" : undefined,
    tasks: state.tasks.length,
  };
}

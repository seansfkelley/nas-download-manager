import type {
  Protocol,
  VisibleTaskSettings,
  TaskSortType,
  ConnectionSettings,
  State,
} from "./latest";
import { updateStateToLatest } from "./update";
import type { BadgeDisplayType } from "./4";
export type { TorrentTrackerSettings } from "./1";
import { typesafeUnionMembers, typesafeMapValues } from "../lang";
export * from "./listen";
export * from "./latest";

export const PROTOCOLS = typesafeUnionMembers<Protocol>({
  http: true,
  https: true,
});

export const ORDERED_VISIBLE_TASK_TYPE_NAMES: Record<keyof VisibleTaskSettings, string> = {
  downloading: browser.i18n.getMessage("Downloading"),
  uploading: browser.i18n.getMessage("Completed_uploading"),
  completed: browser.i18n.getMessage("Completed_not_uploading"),
  errored: browser.i18n.getMessage("Errored"),
  other: browser.i18n.getMessage("Other"),
};

export const ORDERED_TASK_SORT_TYPE_NAMES: Record<TaskSortType, string> = {
  "name-asc": browser.i18n.getMessage("name_AZ"),
  "name-desc": browser.i18n.getMessage("name_ZA"),
  "timestamp-added-desc": browser.i18n.getMessage("date_added_newest_first"),
  "timestamp-added-asc": browser.i18n.getMessage("date_added_oldest_first"),
  "timestamp-completed-desc": browser.i18n.getMessage("date_completed_newest_first"),
  "timestamp-completed-asc": browser.i18n.getMessage("date_completed_oldest_first"),
  "completed-percent-asc": browser.i18n.getMessage("_complete_least_first"),
  "completed-percent-desc": browser.i18n.getMessage("_complete_most_first"),
};

export const ORDERED_BADGE_DISPLAY_TYPE_NAMES: Record<BadgeDisplayType, string> = {
  total: browser.i18n.getMessage("total_task_count"),
  filtered: browser.i18n.getMessage("filtered_task_count"),
};

export function getHostUrl(settings: ConnectionSettings) {
  if (settings.protocol && settings.hostname && settings.port) {
    return `${settings.protocol}://${settings.hostname}:${settings.port}`;
  } else {
    return undefined;
  }
}

export async function updateStateShapeIfNecessary() {
  const updated = updateStateToLatest(await browser.storage.local.get<any>(null));
  await browser.storage.local.clear();
  return browser.storage.local.set<State>(updated);
}

export function redactState(state: State): object {
  const sanitizedConnection: Record<keyof ConnectionSettings, boolean | Protocol> = {
    ...typesafeMapValues(state.settings.connection, Boolean),
    protocol: state.settings.connection.protocol,
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

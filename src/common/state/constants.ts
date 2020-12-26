import type {
  Protocol,
  VisibleTaskSettings,
  TaskSortType,
  BadgeDisplayType,
} from "./migrations/latest";
import { typesafeUnionMembers } from "../lang";

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

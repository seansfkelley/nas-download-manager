import isEqual from "lodash-es/isEqual";
import type { Settings } from "../../common/state";
import { loadTasks } from "../actions";
import type { SettingsChangeListener } from "./types";

let lastSettings: Settings | undefined;
let notificationInterval: number | undefined;

export const onChange: SettingsChangeListener = (settings, api, updateDownloads) => {
  if (!isEqual(lastSettings?.notifications, settings.notifications)) {
    clearInterval(notificationInterval!);
    if (settings.notifications.enableCompletionNotifications) {
      notificationInterval = (setInterval(() => {
        loadTasks(api, updateDownloads);
      }, settings.notifications.completionPollingInterval * 1000) as any) as number;
    }
  }
};

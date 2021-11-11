import isEqual from "lodash-es/isEqual";
import type { Settings } from "../../common/state";
import { loadTasks } from "../actions";
import type { SettingsChangeListener } from "./types";

export const onChange: SettingsChangeListener = (settings, api, updateDownloads, container) => {
  const context = container.get(onChange, {
    lastSettings: undefined as Settings | undefined,
    notificationInterval: undefined as number | undefined,
  });

  if (!isEqual(context.lastSettings?.notifications, settings.notifications)) {
    clearInterval(context.notificationInterval!);
    if (settings.notifications.enableCompletionNotifications) {
      context.notificationInterval = (setInterval(() => {
        loadTasks(api, updateDownloads, container);
      }, settings.notifications.completionPollingInterval * 1000) as any) as number;
    }
    context.lastSettings = settings;
  }
};

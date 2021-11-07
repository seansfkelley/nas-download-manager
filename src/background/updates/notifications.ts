import isEqual from "lodash-es/isEqual";
import { loadTasks } from "../actions";
import type { BackgroundState } from "../backgroundState";

export function update(state: BackgroundState) {
  if (!isEqual(state.lastSettings?.notifications, state.settings.notifications)) {
    clearInterval(state.notificationInterval!);
    if (state.settings.notifications.enableCompletionNotifications) {
      state.notificationInterval = (setInterval(() => {
        loadTasks(state);
      }, state.settings.notifications.completionPollingInterval * 1000) as any) as number;
    }
  }
}

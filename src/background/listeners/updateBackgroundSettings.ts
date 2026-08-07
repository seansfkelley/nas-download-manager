import isEqual from "lodash/isEqual";
import { Settings } from "../../common/state";
import { getMutableStateSingleton } from "../backgroundState";
import { pollTasks } from "../actions";

export async function updateBackgroundSettings(settings: Settings) {
  let backgroundState = getMutableStateSingleton();

  if (!isEqual(settings.notifications, backgroundState.lastNotificationSettings)) {
    backgroundState.lastNotificationSettings = settings.notifications;
    clearInterval(backgroundState.notificationInterval!);
    if (backgroundState.lastNotificationSettings.enableCompletionNotifications) {
      backgroundState.notificationInterval = setInterval(() => {
        pollTasks(backgroundState.api, backgroundState.pollRequestManager);
      }, backgroundState.lastNotificationSettings.completionPollingInterval * 1000) as any as number;
    }
  }

  backgroundState.showNonErrorNotifications = settings.notifications.enableFeedbackNotifications;
}

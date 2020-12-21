import isEqual from "lodash-es/isEqual";
import { SessionName } from "synology-typescript-api";
import { getMutableStateSingleton } from "./backgroundState";
import { getHostUrl, State } from "../common/state";
import { notify } from "../common/notify";
import { pollTasks, clearCachedTasks, updateAndGetTorrentTrackers } from "./actions";
import { assertNever } from "../common/lang";
import { filterTasks } from "../common/filtering";

const START_TIME = Date.now();

export function onStoredStateChange(storedState: State) {
  const backgroundState = getMutableStateSingleton();

  const didUpdateSettings = backgroundState.api.updateSettings({
    baseUrl: getHostUrl(storedState.settings.connection),
    account: storedState.settings.connection.username,
    passwd: storedState.settings.connection.password,
    session: SessionName.DownloadStation,
  });

  if (didUpdateSettings) {
    const clearCachePromise = clearCachedTasks();

    if (backgroundState.didInitializeSettings) {
      // Don't use await because we want this to fire in the background.
      clearCachePromise.then(() => {
        pollTasks(backgroundState.api, backgroundState.pollRequestManager);
      });
    }

    // This is a little bit of a hack, but basically: onStoredStateChange eagerly fires this
    // listener when it initializes. That first time through, the client gets initialized for
    // the first time, and so we necessarily clear and reload. However, if the user hasn't
    // configured notifications, we should try to avoid pinging the NAS, since we know we're
    // opening in the background. Hence this boolean. If notifications are enabled, those'll
    // still get set up and we'll starting pinging in the background.
    backgroundState.didInitializeSettings = true;
  }

  if (!isEqual(storedState.settings.notifications, backgroundState.lastNotificationSettings)) {
    backgroundState.lastNotificationSettings = storedState.settings.notifications;
    clearInterval(backgroundState.notificationInterval!);
    if (backgroundState.lastNotificationSettings.enableCompletionNotifications) {
      backgroundState.notificationInterval = (setInterval(() => {
        pollTasks(backgroundState.api, backgroundState.pollRequestManager);
      }, backgroundState.lastNotificationSettings.completionPollingInterval * 1000) as any) as number;
    }
  }

  backgroundState.showNonErrorNotifications =
    storedState.settings.notifications.enableFeedbackNotifications;

  backgroundState.torrentTrackers = updateAndGetTorrentTrackers(storedState);

  if (storedState.taskFetchFailureReason) {
    browser.browserAction.setIcon({
      path: {
        "16": "icons/icon-16-disabled.png",
        "32": "icons/icon-32-disabled.png",
        "64": "icons/icon-64-disabled.png",
        "128": "icons/icon-128-disabled.png",
        "256": "icons/icon-256-disabled.png",
      },
    });

    browser.browserAction.setBadgeText({
      text: "",
    });

    browser.browserAction.setBadgeBackgroundColor({ color: [217, 0, 0, 255] });
  } else {
    browser.browserAction.setIcon({
      path: {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "64": "icons/icon-64.png",
        "128": "icons/icon-128.png",
        "256": "icons/icon-256.png",
      },
    });

    let taskCount;
    if (storedState.settings.badgeDisplayType === "total") {
      taskCount = storedState.tasks.length;
    } else if (storedState.settings.badgeDisplayType === "filtered") {
      taskCount = filterTasks(storedState.tasks, storedState.settings.visibleTasks).length;
    } else {
      assertNever(storedState.settings.badgeDisplayType);
      return; // Can't `return assertNever(...)` because the linter complains.
    }

    browser.browserAction.setBadgeText({
      text: taskCount === 0 ? "" : taskCount.toString(),
    });

    browser.browserAction.setBadgeBackgroundColor({ color: [0, 217, 0, 255] });
  }

  if (
    storedState.tasksLastCompletedFetchTimestamp != null &&
    storedState.tasksLastCompletedFetchTimestamp > START_TIME &&
    storedState.taskFetchFailureReason == null
  ) {
    const updatedFinishedTaskIds = storedState.tasks
      .filter((t) => t.status === "finished" || t.status === "seeding")
      .map((t) => t.id);
    if (
      backgroundState.finishedTaskIds != null &&
      storedState.settings.notifications.enableCompletionNotifications
    ) {
      updatedFinishedTaskIds
        .filter((id) => !backgroundState.finishedTaskIds!.has(id))
        .forEach((id) => {
          const task = storedState.tasks.find((t) => t.id === id)!;
          notify(`${task.title}`, browser.i18n.getMessage("Download_finished"));
        });
    }
    backgroundState.finishedTaskIds = new Set(updatedFinishedTaskIds);
  }
}

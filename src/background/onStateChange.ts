import {
  getMutableStateSingleton,
  clearCachedSession,
  resolveSettingsReady,
} from "./backgroundState";
import { SessionName } from "../common/apis/synology/shared";
import { getHostUrl, type State } from "../common/state/defaults";
import { notify } from "../common/notify";
import { pollTasks, clearCachedTasks } from "./actions/pollTasks";
import { assertNever } from "../common/lang";
import { filterTasks, matchesFilter } from "../common/filtering";

const START_TIME = Date.now();

export function onStoredStateChange(storedState: State) {
  const backgroundState = getMutableStateSingleton();

  let didUpdateSettings = backgroundState.api.partiallyUpdateSettings({
    baseUrl: getHostUrl(storedState.settings.connection),
    account: storedState.settings.connection.username,
    session: SessionName.DownloadStation,
    // Do NOT set password from here. It might not be set because of the "remember me" feature, so
    // we could erroneously overwrite it. Instead, read it once at startup time (if configured), and
    // otherwise, wait for an imperative login request message to be handled elsewhere.
  });

  if (
    storedState.settings.connection.rememberPassword &&
    storedState.settings.connection.password
  ) {
    // Note the ordering here: avoid short-circuiting.
    didUpdateSettings =
      backgroundState.api.partiallyUpdateSettings({
        passwd: storedState.settings.connection.password,
      }) || didUpdateSettings;
  }

  if (didUpdateSettings) {
    if (!backgroundState.isInitializingExtension) {
      clearCachedSession();
    }
    const clearCachePromise = clearCachedTasks();

    // Don't use await because we want this to fire in the background.
    clearCachePromise
      .then(() => pollTasks(backgroundState.api, backgroundState.pollRequestManager))
      .catch((e) => console.error("error during post-settings-change poll", e));
  }

  if (
    JSON.stringify(storedState.settings.notifications) !==
    JSON.stringify(backgroundState.lastNotificationSettings)
  ) {
    backgroundState.lastNotificationSettings = storedState.settings.notifications;
    if (backgroundState.lastNotificationSettings.enableCompletionNotifications) {
      browser.alarms.create("poll-tasks", {
        periodInMinutes: backgroundState.lastNotificationSettings.completionPollingInterval / 60,
      });
    } else {
      browser.alarms.clear("poll-tasks");
    }
  }

  backgroundState.showNonErrorNotifications =
    storedState.settings.notifications.enableFeedbackNotifications;

  if (storedState.taskFetchFailureReason) {
    browser.action.setIcon({
      path: {
        "16": "/icons/icon-16-disabled.png",
        "32": "/icons/icon-32-disabled.png",
        "64": "/icons/icon-64-disabled.png",
        "128": "/icons/icon-128-disabled.png",
        "256": "/icons/icon-256-disabled.png",
      },
    });

    browser.action.setBadgeText({
      text: "",
    });

    browser.action.setBadgeBackgroundColor({ color: [217, 0, 0, 255] });
  } else {
    browser.action.setIcon({
      path: {
        "16": "/icons/icon-16.png",
        "32": "/icons/icon-32.png",
        "64": "/icons/icon-64.png",
        "128": "/icons/icon-128.png",
        "256": "/icons/icon-256.png",
      },
    });

    let taskCount;
    if (storedState.settings.badgeDisplayType === "total") {
      taskCount = storedState.tasks.length;
    } else if (storedState.settings.badgeDisplayType === "filtered") {
      taskCount = filterTasks(
        storedState.tasks,
        storedState.settings.visibleTasks,
        storedState.settings.showInactiveTasks,
      ).length;
    } else if (storedState.settings.badgeDisplayType === "completed") {
      taskCount = storedState.tasks.filter(
        (t) => matchesFilter(t, "completed") || matchesFilter(t, "uploading"),
      ).length;
    } else {
      assertNever(storedState.settings.badgeDisplayType);
      return; // Can't `return assertNever(...)` because the linter complains.
    }

    browser.action.setBadgeText({
      text: taskCount === 0 ? "" : taskCount.toString(),
    });

    browser.action.setBadgeBackgroundColor({ color: [0, 217, 0, 255] });
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

  backgroundState.isInitializingExtension = false;
  resolveSettingsReady();
}

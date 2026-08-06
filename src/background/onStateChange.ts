import { getHostUrl, State } from "../common/state";
import { notify } from "../common/notify";
import { saveLastSevereError } from "../common/errorHandlers";
import { setPollingEnabled } from "./alarms";
import { pollTasks, clearCachedTasks } from "./actions";
import { assertNever } from "../common/lang";
import { filterTasks, matchesFilter } from "../common/filtering";
import {
  getCachedTasksConnection,
  getFinishedTaskIds,
  setCachedTasksConnection,
  setFinishedTaskIds,
  getBackgroundContext,
} from "./backgroundState";

export function onStoredStateChange(storedState: State) {
  updateBadge(storedState);
  react(storedState).catch(saveLastSevereError);
}

async function react(storedState: State) {
  await setPollingEnabled(storedState.settings.notifications.enableCompletionNotifications);
  await maybeInvalidateCachedTasks(storedState);
  await maybeNotifyFinishedTasks(storedState);
}

// The cached tasks belong to whichever DiskStation they came from, so a change of host or account
// throws them away. This used to be inferred from the client rejecting an update to its settings;
// with no long-lived client left to ask, the provenance is recorded in session storage instead.
async function maybeInvalidateCachedTasks(storedState: State) {
  const { connection } = storedState.settings;
  const current = `${getHostUrl(connection)}|${connection.username}`;
  const previous = await getCachedTasksConnection();

  if (previous !== current) {
    await setCachedTasksConnection(current);
    await clearCachedTasks();
    if (previous != null) {
      // Absent means this is the first state change of the browser session rather than a real
      // change, and there is no reason to wake the NAS just because the browser started.
      await pollTasks((await getBackgroundContext()).api);
    }
  }
}

async function maybeNotifyFinishedTasks(storedState: State) {
  if (
    storedState.tasksLastCompletedFetchTimestamp == null ||
    storedState.taskFetchFailureReason != null
  ) {
    return;
  }

  const finishedTaskIds = storedState.tasks
    .filter((t) => t.status === "finished" || t.status === "seeding")
    .map((t) => t.id);
  const previous = await getFinishedTaskIds();

  if (previous != null && storedState.settings.notifications.enableCompletionNotifications) {
    finishedTaskIds
      .filter((id) => !previous.has(id))
      .forEach((id) => {
        const task = storedState.tasks.find((t) => t.id === id)!;
        // Keyed on the task so that two overlapping reads of the baseline collapse into one
        // notification rather than showing the same finished download twice.
        notify(
          `${task.title}`,
          browser.i18n.getMessage("Download_finished"),
          "regular",
          `task-finished-${task.id}`,
        );
      });
  }

  await setFinishedTaskIds(finishedTaskIds);
}

function updateBadge(storedState: State) {
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

    browser.browserAction.setBadgeText({
      text: taskCount === 0 ? "" : taskCount.toString(),
    });

    browser.browserAction.setBadgeBackgroundColor({ color: [0, 217, 0, 255] });
  }
}

import {
  type CachedTasks,
  type PersistentState,
  type Settings,
  getCachedTasks,
  getCurrentPersistentState,
  getHostUrl,
  SessionState,
} from "../common/state";
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

export function reactToPersistentState(state: PersistentState) {
  react(state).catch(saveLastSevereError);
}

async function react(state: PersistentState) {
  await setPollingEnabled(state.settings.notifications.enableCompletionNotifications);
  await maybeInvalidateCachedTasks(state);
  // Read rather than remembered: the badge needs both halves, and a background context that can be
  // suspended has nowhere to keep the half it was not just handed.
  updateBadge(state.settings, getCachedTasks(await SessionState.get()));
}

export function reactToCachedTasks(cachedTasks: CachedTasks) {
  reactToTasks(cachedTasks).catch(saveLastSevereError);
}

async function reactToTasks(cachedTasks: CachedTasks) {
  // The other side of the guard in onPersistentStateChange: tasks can be delivered before the
  // stored state is a shape the settings can be read out of.
  const state = await getCurrentPersistentState();
  if (state == null) {
    return;
  }

  updateBadge(state.settings, cachedTasks);
  await maybeNotifyFinishedTasks(state.settings, cachedTasks);
}

// The cached tasks belong to whichever DiskStation they came from, so a change of host or account
// throws them away. This used to be inferred from the client rejecting an update to its settings;
// with no long-lived client left to ask, the provenance is recorded in session storage instead.
async function maybeInvalidateCachedTasks(state: PersistentState) {
  const { connection } = state.settings;
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

async function maybeNotifyFinishedTasks(settings: Settings, cachedTasks: CachedTasks) {
  if (
    cachedTasks.tasksLastCompletedFetchTimestamp == null ||
    cachedTasks.taskFetchFailureReason != null
  ) {
    return;
  }

  // Sorted so that the comparison below is about membership rather than about what order the NAS
  // happened to list them in.
  const finishedTaskIds = cachedTasks.tasks
    .filter((t) => t.status === "finished" || t.status === "seeding")
    .map((t) => t.id)
    .sort();
  const previous = await getFinishedTaskIds();

  if (previous != null && settings.notifications.enableCompletionNotifications) {
    finishedTaskIds
      .filter((id) => !previous.includes(id))
      .forEach((id) => {
        const task = cachedTasks.tasks.find((t) => t.id === id)!;
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

  // A write is an event, and this runs from a listener. Rewriting an unchanged list would wake
  // this again to write it again, forever.
  if (previous == null || !sameIds(previous, finishedTaskIds)) {
    await setFinishedTaskIds(finishedTaskIds);
  }
}

// Both sides are sorted, so this is the whole comparison. lodash's isEqual would do it too, and
// drags the Function constructor into the background bundle, which web-ext lint flags as eval.
function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function updateBadge(settings: Settings, cachedTasks: CachedTasks) {
  if (cachedTasks.taskFetchFailureReason) {
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
    if (settings.badgeDisplayType === "total") {
      taskCount = cachedTasks.tasks.length;
    } else if (settings.badgeDisplayType === "filtered") {
      taskCount = filterTasks(
        cachedTasks.tasks,
        settings.visibleTasks,
        settings.showInactiveTasks,
      ).length;
    } else if (settings.badgeDisplayType === "completed") {
      taskCount = cachedTasks.tasks.filter(
        (t) => matchesFilter(t, "completed") || matchesFilter(t, "uploading"),
      ).length;
    } else {
      assertNever(settings.badgeDisplayType);
      return; // Can't `return assertNever(...)` because the linter complains.
    }

    browser.browserAction.setBadgeText({
      text: taskCount === 0 ? "" : taskCount.toString(),
    });

    browser.browserAction.setBadgeBackgroundColor({ color: [0, 217, 0, 255] });
  }
}

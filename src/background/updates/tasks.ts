import type { BackgroundState } from "../backgroundState";
import { notify } from "../../common/notify";
import { assertNever } from "../../common/lang";
import { filterTasks } from "../../common/filtering";

const START_TIME = Date.now();

export function update(state: BackgroundState) {
  if (state.taskFetchFailureReason) {
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
    if (state.settings.badgeDisplayType === "total") {
      taskCount = state.tasks.length;
    } else if (state.settings.badgeDisplayType === "filtered") {
      taskCount = filterTasks(state.tasks, state.settings.visibleTasks).length;
    } else {
      assertNever(state.settings.badgeDisplayType);
      return; // Can't `return assertNever(...)` because the linter complains.
    }

    browser.browserAction.setBadgeText({
      text: taskCount === 0 ? "" : taskCount.toString(),
    });

    browser.browserAction.setBadgeBackgroundColor({ color: [0, 217, 0, 255] });
  }

  if (
    state.tasksLastCompletedFetchTimestamp != null &&
    state.tasksLastCompletedFetchTimestamp > START_TIME &&
    state.taskFetchFailureReason == null
  ) {
    const updatedFinishedTaskIds = state.tasks
      .filter((t) => t.status === "finished" || t.status === "seeding")
      .map((t) => t.id);
    if (
      state.finishedTaskIds != null &&
      state.settings.notifications.enableCompletionNotifications
    ) {
      updatedFinishedTaskIds
        .filter((id) => !state.finishedTaskIds!.has(id))
        .forEach((id) => {
          const task = state.tasks.find((t) => t.id === id)!;
          notify(`${task.title}`, browser.i18n.getMessage("Download_finished"));
        });
    }
    state.finishedTaskIds = new Set(updatedFinishedTaskIds);
  }
}

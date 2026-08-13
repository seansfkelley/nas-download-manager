import { filterTasks, matchesFilter } from "../../common/filtering";
import { assertNever } from "../../common/lang";
import { Settings, TaskState } from "../../common/state";

export async function updateBadge(
  settings: Settings,
  { tasks, taskFetchFailureReason }: Pick<TaskState, "tasks" | "taskFetchFailureReason">,
) {
  if (taskFetchFailureReason) {
    browser.action.setIcon({
      path: {
        "16": "icons/icon-16-disabled.png",
        "32": "icons/icon-32-disabled.png",
        "64": "icons/icon-64-disabled.png",
        "128": "icons/icon-128-disabled.png",
        "256": "icons/icon-256-disabled.png",
      },
    });

    browser.action.setBadgeText({
      text: "",
    });

    browser.action.setBadgeBackgroundColor({ color: [217, 0, 0, 255] });
  } else {
    browser.action.setIcon({
      path: {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "64": "icons/icon-64.png",
        "128": "icons/icon-128.png",
        "256": "icons/icon-256.png",
      },
    });

    let taskCount: number;
    if (tasks == null) {
      taskCount = 0;
    } else if (settings.badgeDisplayType === "total") {
      taskCount = tasks.length;
    } else if (settings.badgeDisplayType === "filtered") {
      taskCount = filterTasks(tasks, settings.visibleTasks, settings.showInactiveTasks).length;
    } else if (settings.badgeDisplayType === "completed") {
      taskCount = tasks.filter(
        (t) => matchesFilter(t, "completed") || matchesFilter(t, "uploading"),
      ).length;
    } else {
      return assertNever(settings.badgeDisplayType);
    }

    browser.action.setBadgeText({
      text: taskCount === 0 ? "" : taskCount.toString(),
    });

    browser.action.setBadgeBackgroundColor({ color: [0, 217, 0, 255] });
  }
}

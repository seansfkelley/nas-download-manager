import type { DownloadStationTask } from "../../common/apis/synology/DownloadStation/Task";
import { filterTasks } from "../../common/filtering";
import { assertNever } from "../../common/lang";
import { getStateSingleton } from "../backgroundState";
import { registerDownloadsChangeListener, registerSettingsChangeListener } from "./registry";

function updateBadge() {
  const { settings, downloads } = getStateSingleton();

  if (downloads.taskFetchFailureReason) {
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
      taskCount = downloads.tasks.length;
    } else if (settings.badgeDisplayType === "filtered") {
      taskCount = filterTasks(downloads.tasks as DownloadStationTask[], settings.visibleTasks)
        .length;
    } else {
      assertNever(settings.badgeDisplayType);
    }

    browser.browserAction.setBadgeText({
      text: taskCount === 0 ? "" : taskCount.toString(),
    });

    browser.browserAction.setBadgeBackgroundColor({ color: [0, 217, 0, 255] });
  }
}

registerSettingsChangeListener(updateBadge);
registerDownloadsChangeListener(updateBadge);

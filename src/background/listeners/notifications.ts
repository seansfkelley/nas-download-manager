import { notify } from "../../common/notify";
import type { ReadonlyListener } from "./types";

const START_TIME = Date.now();

let finishedTaskIds: Set<string> | undefined;

export const onChange: ReadonlyListener = (settings, downloads) => {
  if (
    downloads.tasksLastCompletedFetchTimestamp != null &&
    downloads.tasksLastCompletedFetchTimestamp > START_TIME &&
    downloads.taskFetchFailureReason == null
  ) {
    const updatedFinishedTaskIds = downloads.tasks
      .filter((t) => t.status === "finished" || t.status === "seeding")
      .map((t) => t.id);
    if (finishedTaskIds != null && settings.notifications.enableCompletionNotifications) {
      updatedFinishedTaskIds
        .filter((id) => !finishedTaskIds!.has(id))
        .forEach((id) => {
          const task = downloads.tasks.find((t) => t.id === id)!;
          notify(`${task.title}`, browser.i18n.getMessage("Download_finished"));
        });
    }
    finishedTaskIds = new Set(updatedFinishedTaskIds);
  }
};

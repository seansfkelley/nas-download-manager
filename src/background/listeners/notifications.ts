import { notify } from "../../common/notify";
import type { ReadonlyListener } from "./types";

export const onChange: ReadonlyListener = (settings, downloads, container) => {
  if (
    downloads.tasksLastCompletedFetchTimestamp != null &&
    downloads.taskFetchFailureReason == null
  ) {
    const updatedFinishedTaskIds = downloads.tasks
      .filter((t) => t.status === "finished" || t.status === "seeding")
      .map((t) => t.id);

    const context = container.get(onChange, {
      finishedTaskIds: undefined as Set<string> | undefined,
    });

    if (context.finishedTaskIds != null && settings.notifications.enableCompletionNotifications) {
      updatedFinishedTaskIds
        .filter((id) => !context.finishedTaskIds!.has(id))
        .forEach((id) => {
          const task = downloads.tasks.find((t) => t.id === id)!;
          notify(`${task.title}`, browser.i18n.getMessage("Download_finished"));
        });
    }

    context.finishedTaskIds = new Set(updatedFinishedTaskIds);
  }
};

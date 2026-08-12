import isEqual from "lodash/isEqual";

import { sendNotification } from "../../common/sendNotification";
import { SessionState, Settings } from "../../common/state";

export async function notifyForCompletedDownloads(
  settings: Settings,
  {
    tasks,
    taskFetchFailureReason,
    tasksLastCompletedFetchTimestamp,
    finishedTaskIds,
  }: Pick<
    SessionState,
    "tasks" | "taskFetchFailureReason" | "tasksLastCompletedFetchTimestamp" | "finishedTaskIds"
  >,
) {
  // No baseline means nothing has been seen finished this session, which is what the old
  // module-scope start timestamp approximated back when the background page never unloaded.
  if (tasks != null && tasksLastCompletedFetchTimestamp != null && taskFetchFailureReason == null) {
    const updatedFinishedTaskIds = tasks
      .filter((t) => t.status === "finished" || t.status === "seeding")
      .map((t) => t.id);

    if (finishedTaskIds != null) {
      const alreadyFinishedTaskIds = new Set(finishedTaskIds);

      if (settings.notifications.enableCompletionNotifications) {
        for (const id of updatedFinishedTaskIds) {
          if (!alreadyFinishedTaskIds.has(id)) {
            // Linear scan should be fine; this loop body should be hit extremely rarely.
            const task = tasks.find((t) => t.id === id)!;
            sendNotification(`${task.title}`, browser.i18n.getMessage("Download_finished"));
          }
        }
      }
    }

    // Watch out for event trigger cycles!
    if (!isEqual(updatedFinishedTaskIds.toSorted(), finishedTaskIds?.toSorted())) {
      await SessionState.set({ finishedTaskIds: updatedFinishedTaskIds });
    }
  }
}

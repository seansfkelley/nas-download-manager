import { typesafeIsEqual } from "../../common/lang";
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
    const finishedTaskTitlesById = new Map(
      tasks
        .filter((t) => t.status === "finished" || t.status === "seeding")
        .map((t) => [t.id, t.title] as const),
    );
    const updatedFinishedTaskIds = [...finishedTaskTitlesById.keys()];

    if (finishedTaskIds != null) {
      const newlyFinishedTaskIds = new Set(updatedFinishedTaskIds).difference(
        new Set(finishedTaskIds),
      );

      if (settings.notifications.enableCompletionNotifications && newlyFinishedTaskIds.size > 0) {
        const titles = [...newlyFinishedTaskIds].map((id) => finishedTaskTitlesById.get(id)!);

        if (titles.length === 1) {
          sendNotification(titles[0], browser.i18n.getMessage("Download_finished"));
        } else {
          sendNotification(
            browser.i18n.getMessage("ZcountZ_downloads_finished", [titles.length]),
            titles.join(", "),
          );
        }
      }
    }

    // Watch out for event trigger cycles!
    if (!typesafeIsEqual(updatedFinishedTaskIds.toSorted(), finishedTaskIds?.toSorted())) {
      await SessionState.set({ finishedTaskIds: updatedFinishedTaskIds });
    }
  }
}

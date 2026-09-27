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
    const newlyFinishedTaskIds = new Set(finishedTaskTitlesById.keys()).difference(
      new Set(finishedTaskIds),
    );

    if (finishedTaskIds != null) {
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

    // Accumulated rather than replaced, so a finished task that is paused and resumed isn't new.
    // Only write when something changed; watch out for event trigger cycles!
    if (finishedTaskIds == null || newlyFinishedTaskIds.size > 0) {
      await SessionState.set({
        finishedTaskIds: [...(finishedTaskIds ?? []), ...newlyFinishedTaskIds],
      });
    }
  }
}

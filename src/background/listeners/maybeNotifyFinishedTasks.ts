import { type TaskState, type Settings, SessionState } from "../common/state";
import { notify } from "../common/notify";
import isEqual from "lodash/isEqual";

export async function maybeNotifyFinishedTasks(
  settings: Settings,
  { tasks, tasksLastCompletedFetchTimestamp, taskFetchFailureReason }: TaskState,
) {
  if (tasksLastCompletedFetchTimestamp == null || taskFetchFailureReason != null || tasks == null) {
    return;
  }

  const finishedTaskIds = tasks
    .filter((t) => t.status === "finished" || t.status === "seeding")
    .map((t) => t.id)
    .sort();

  const previous = (await SessionState.get())?.finishedTaskIds?.sort();
  if (isEqual(previous, finishedTaskIds)) {
    return;
  }

  if (settings.notifications.enableCompletionNotifications) {
    const previousSet = new Set(previous);
    for (const id of finishedTaskIds) {
      if (!previousSet.has(id)) {
        // Lazily do a linear scan because we should only be getting 1-2 finished downloads in a
        // single batch.

        const task = tasks.find((t) => t.id === id)!;

        notify(
          `${task.title}`,
          browser.i18n.getMessage("Download_finished"),
          "regular",
          `task-finished-${task.id}`,
        );
      }
    }
  }

  await SessionState.set({ finishedTaskIds });
}

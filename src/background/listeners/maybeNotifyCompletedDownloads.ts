import { notify } from "../../common/notify";
import { Settings, TaskState } from "../../common/state";
import { getMutableStateSingleton } from "../backgroundState";

const START_TIME = Date.now();

export async function maybeNotifyCompletedDownloads(
  settings: Settings,
  { tasks, taskFetchFailureReason, tasksLastCompletedFetchTimestamp }: TaskState,
) {
  let backgroundState = getMutableStateSingleton();

  if (
    tasks != null &&
    tasksLastCompletedFetchTimestamp != null &&
    tasksLastCompletedFetchTimestamp > START_TIME &&
    taskFetchFailureReason == null
  ) {
    const updatedFinishedTaskIds = tasks
      .filter((t) => t.status === "finished" || t.status === "seeding")
      .map((t) => t.id);
    if (
      backgroundState.finishedTaskIds != null &&
      settings.notifications.enableCompletionNotifications
    ) {
      updatedFinishedTaskIds
        .filter((id) => !backgroundState.finishedTaskIds!.has(id))
        .forEach((id) => {
          const task = tasks.find((t) => t.id === id)!;
          notify(`${task.title}`, browser.i18n.getMessage("Download_finished"));
        });
    }
    backgroundState.finishedTaskIds = new Set(updatedFinishedTaskIds);
  }
}

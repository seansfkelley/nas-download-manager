import isEqual from "lodash-es/isEqual";
import { notify } from "../../common/notify";
import type { Settings } from "../../common/state";
import { loadTasks } from "../actions";
import type { CommonBackgroundState } from "../backgroundState";

const START_TIME = Date.now();

let lastSettings: Settings | undefined;
let notificationInterval: number | undefined;
let finishedTaskIds: Set<string> | undefined;

export function onChange(state: CommonBackgroundState) {
  if (!isEqual(lastSettings?.notifications, state.settings.notifications)) {
    clearInterval(notificationInterval!);
    if (state.settings.notifications.enableCompletionNotifications) {
      notificationInterval = (setInterval(() => {
        loadTasks(state);
      }, state.settings.notifications.completionPollingInterval * 1000) as any) as number;
    }
  }

  if (
    state.downloads.tasksLastCompletedFetchTimestamp != null &&
    state.downloads.tasksLastCompletedFetchTimestamp > START_TIME &&
    state.downloads.taskFetchFailureReason == null
  ) {
    const updatedFinishedTaskIds = state.downloads.tasks
      .filter((t) => t.status === "finished" || t.status === "seeding")
      .map((t) => t.id);
    if (finishedTaskIds != null && state.settings.notifications.enableCompletionNotifications) {
      updatedFinishedTaskIds
        .filter((id) => !finishedTaskIds!.has(id))
        .forEach((id) => {
          const task = state.downloads.tasks.find((t) => t.id === id)!;
          notify(`${task.title}`, browser.i18n.getMessage("Download_finished"));
        });
    }
    finishedTaskIds = new Set(updatedFinishedTaskIds);
  }

  lastSettings = state.settings;
}

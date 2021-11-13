import { isEqual } from "lodash";
import { notify } from "../../common/notify";
import type { Settings } from "../../common/state";
import { loadTasks } from "../actions";
import { getStateSingleton } from "../backgroundState";
import type { Listener } from "./registry";

let finishedTaskIds: Set<string> | undefined = undefined;
let lastSettings: Settings | undefined = undefined;
let notificationInterval: number | undefined = undefined;

export const sendCompletionNotifications = (() => {
  const { settings, downloads } = getStateSingleton();

  if (!isEqual(lastSettings?.notifications, settings.notifications)) {
    clearInterval(notificationInterval!);
    if (settings.notifications.enableCompletionNotifications) {
      notificationInterval = (setInterval(() => {
        loadTasks();
      }, settings.notifications.completionPollingInterval * 1000) as any) as number;
    }
    lastSettings = settings;
  }

  if (
    downloads.tasksLastCompletedFetchTimestamp != null &&
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
}) as Listener;

sendCompletionNotifications.listenTo = ["settings", "downloads"];

import "../common/init/nonContentContext";
import { saveLastSevereError } from "../common/errorHandlers";
import {
  reactToPersistentState,
  PersistentState,
  SessionState,
  reactToSessionState,
} from "../common/state";
import { migrateState } from "../common/state/migrations/update";

import { fetchTasks } from "./actions";
import { initializeContextMenus } from "./contextMenus";
import { notifyForCompletedDownloads } from "./listeners/notifyForCompletedDownloads";
import { refetchOnConnectionChange } from "./listeners/refetchOnConnectionChange";
import { POLL_TASKS_ALARM, updateBackgroundPollAlarm } from "./listeners/updateBackgroundPollAlarm";
import { updateBadge } from "./listeners/updateBadge";
import { initializeMessageHandler } from "./messages";

initializeContextMenus();
initializeMessageHandler();

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_TASKS_ALARM) {
    console.log("poll alarm fired");
    fetchTasks();
  }
});

(async () => {
  try {
    const updated = migrateState(await browser.storage.local.get(null));
    await PersistentState.set(updated);
    console.log("successfully migrated persistent state");

    reactToPersistentState("settings", async ({ settings }) => {
      try {
        await refetchOnConnectionChange();
        await updateBackgroundPollAlarm(settings);

        const sessionState = await SessionState.get();
        await updateBadge(settings, sessionState);
        await notifyForCompletedDownloads(settings, sessionState);
      } catch (error) {
        saveLastSevereError(error);
      }
    });

    reactToSessionState(
      "tasks",
      "taskFetchFailureReason",
      "tasksLastCompletedFetchTimestamp",
      "finishedTaskIds",
      async (sessionState) => {
        try {
          const persistentState = await PersistentState.get();
          if (persistentState == null) {
            console.warn("skipping background update: persistent state not yet migrated");
          } else {
            await updateBadge(persistentState.settings, sessionState);
            await notifyForCompletedDownloads(persistentState.settings, sessionState);
          }
        } catch (error) {
          saveLastSevereError(error);
        }
      },
    );
  } catch (error) {
    saveLastSevereError(error);
  }
})();

import "../common/init/nonContentContext";
import {
  reactToPersistentState,
  PersistentState,
  SessionState,
  reactToSessionState,
} from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";
import { migrateState } from "../common/state/migrations/update";
import { updateCredentials } from "./listeners/updateCredentials";
import { updateBadge } from "./listeners/updateBadge";
import { POLL_TASKS_ALARM, updateBackgroundPollAlarm } from "./listeners/updateBackgroundPollAlarm";
import { maybeNotifyCompletedDownloads } from "./listeners/maybeNotifyCompletedDownloads";
import { getMutableStateSingleton } from "./backgroundState";
import { fetchTasks } from "./actions";

initializeContextMenus();
initializeMessageHandler();

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_TASKS_ALARM) {
    console.log("poll alarm fired");
    fetchTasks(getMutableStateSingleton().api);
  }
});

(async () => {
  try {
    const updated = migrateState(await browser.storage.local.get(null));
    await PersistentState.set(updated);
    console.log("successfully migrated persistent state");

    reactToPersistentState("settings", async ({ settings }) => {
      await updateCredentials(settings);
      await updateBackgroundPollAlarm(settings);

      const sessionState = await SessionState.get();
      await updateBadge(settings, sessionState);
      await maybeNotifyCompletedDownloads(settings, sessionState);
    });

    reactToSessionState(
      "tasks",
      "taskFetchFailureReason",
      "tasksLastCompletedFetchTimestamp",
      "finishedTaskIds",
      async (sessionState) => {
        const persistentState = await PersistentState.get();
        if (persistentState == null) {
          console.warn("skipping background update: persistent state not yet migrated");
        } else {
          await updateBadge(persistentState.settings, sessionState);
          await maybeNotifyCompletedDownloads(persistentState.settings, sessionState);
        }
      },
    );
  } catch (error) {
    saveLastSevereError(error);
  }
})();

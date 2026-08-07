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
import { getMutableStateSingleton } from "./backgroundState";
import { initializeContextMenus } from "./contextMenus";
import { maybeNotifyCompletedDownloads } from "./listeners/maybeNotifyCompletedDownloads";
import { POLL_TASKS_ALARM, updateBackgroundPollAlarm } from "./listeners/updateBackgroundPollAlarm";
import { updateBadge } from "./listeners/updateBadge";
import { updateCredentials } from "./listeners/updateCredentials";
import { initializeMessageHandler } from "./messages";

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

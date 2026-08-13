import "../common/init/nonContentContext";
import { saveLastSevereError } from "../common/errorHandlers";
import {
  PersistentState,
  SessionState,
  reactToPersistentState,
  reactToSessionState,
} from "../common/state";
import { LATEST_STATE_VERSION, migrateState } from "../common/state/migrations/migrateState";

import { registerAlarms } from "./browser-listeners/registerAlarms";
import { registerContextMenus } from "./browser-listeners/registerContextMenus";
import { registerMessages } from "./browser-listeners/registerMessages";
import { registerRuntimeInstalled } from "./browser-listeners/registerRuntimeInstalled";
import { singleton } from "./clientSingleton";
import { notifyForCompletedDownloads } from "./state-listeners/notifyForCompletedDownloads";
import { updateBackgroundPollAlarm } from "./state-listeners/updateBackgroundPollAlarm";
import { updateBadge } from "./state-listeners/updateBadge";

registerAlarms();
registerContextMenus();
registerMessages();
registerRuntimeInstalled();

// Idempotent and safe to do on every wake. Better than doing it on installation; should it fail,
// this will retry should something weird happen with e.g. revoked permissions.
(async () => {
  try {
    const { stateVersion } = await browser.storage.local.get("stateVersion");
    // This runs on every wakeup, so skip the whole read-migrate-write when there is nothing to do.
    if (stateVersion === LATEST_STATE_VERSION) {
      return;
    }
    await PersistentState.set(migrateState(await browser.storage.local.get(null)));
    console.log("successfully migrated persistent state");
  } catch (error) {
    saveLastSevereError(error);
  }
})();

reactToPersistentState("settings", async ({ settings }) => {
  try {
    await updateBackgroundPollAlarm(singleton, settings);

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

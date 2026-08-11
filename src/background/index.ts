import "../common/init/nonContentContext";
import {
  ConnectionFailure,
  SynologyAuth,
  SynologyClient,
  SynologyClientSettings,
} from "../common/apis/synology";
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

async function getClientSettings(): Promise<SynologyClientSettings | ConnectionFailure> {
  const [persistentState, sessionState] = await Promise.all([
    PersistentState.get(),
    SessionState.get(),
  ]);
  const connection = persistentState?.settings.connection;
  return SynologyClientSettings.fromConnection(
    connection,
    // The password is stored in session state iff remember password is not set, so prefer it.
    sessionState.password ?? connection?.password,
  );
}

async function getStoredAuth(settings: SynologyClientSettings): Promise<SynologyAuth | undefined> {
  const stored = (await SessionState.get()).auth;
  return stored != null && SynologyClientSettings.isEqual(stored.settings, settings)
    ? stored.auth
    : undefined;
}

// A login that started under superseded settings must not clobber the current session's auth. Must
// never throw: the client awaits this, and a failed write should not fail the request that caused it.
async function onAuthChange(settings: SynologyClientSettings, auth: SynologyAuth | undefined) {
  try {
    const currentSettings = await getClientSettings();
    if (
      ConnectionFailure.is(currentSettings) ||
      !SynologyClientSettings.isEqual(currentSettings, settings)
    ) {
      console.log("discarding auth change belonging to superseded settings");
    } else if (auth == null) {
      await SessionState.set({ auth: undefined });
    } else {
      await SessionState.set({ auth: { settings, auth } });
    }
  } catch (e) {
    saveLastSevereError(e, "error while persisting auth to session state");
  }
}

// Safe to construct at module scope: it does no I/O until a request is made, and it holds no state
// that outliving a single worker wakeup would corrupt.
//
// A global singleton makes it much easier to deduplicate authentication for multiple requests and
// to ensure all auth-state reads/writes are consistent.
const client = new SynologyClient(getClientSettings, getStoredAuth, onAuthChange);

initializeContextMenus(client);
initializeMessageHandler(client);

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_TASKS_ALARM) {
    console.log("poll alarm fired");
    fetchTasks(client);
  }
});

(async () => {
  try {
    const updated = migrateState(await browser.storage.local.get(null));
    await PersistentState.set(updated);
    console.log("successfully migrated persistent state");

    reactToPersistentState("settings", async ({ settings }) => {
      try {
        await refetchOnConnectionChange(client);
        await updateBackgroundPollAlarm(client, settings);

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

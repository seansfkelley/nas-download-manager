import "../common/init/nonContentContext";
import {
  ConnectionFailure,
  SynologyAuth,
  SynologyClient,
  SynologyClientSettings,
} from "../common/apis/synology";
import { saveLastSevereError } from "../common/errorHandlers";
import {
  PersistentState,
  SessionState,
  reactToPersistentState,
  reactToSessionState,
} from "../common/state";
import { LATEST_STATE_VERSION, migrateState } from "../common/state/migrations/migrateState";

import { fetchTasks } from "./actions";
import { initializeContextMenus } from "./contextMenus";
import { notifyForCompletedDownloads } from "./listeners/notifyForCompletedDownloads";
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

// Since we construct the client as a singleton, we defer the read/write lifecycle of this to it
// completely since we don't need to reconcile multiple readers and writers.
async function onAuthChange(settings: SynologyClientSettings, auth: SynologyAuth | undefined) {
  try {
    if (auth == null) {
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

browser.runtime.onInstalled.addListener(async () => {
  // The session state carries no version and no migrations; this is what makes that safe.
  try {
    await SessionState.clear();
  } catch (error) {
    saveLastSevereError(error);
  }
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_TASKS_ALARM) {
    console.log("poll alarm fired");
    fetchTasks(client);
  }
});

// A promise the listeners await rather than a block they live inside: registering a listener after
// an await means it is absent when the browser wants to wake this context for its event.
const migrated = (async () => {
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
    await migrated;
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
      await migrated;
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

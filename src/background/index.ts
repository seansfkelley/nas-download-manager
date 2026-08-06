import "../common/init/nonContentContext";
import {
  migratePersistentState,
  onPersistentStateChange,
  onSessionStateChange,
  PersistentState,
  SessionState,
  TaskState,
} from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";
import { createContextMenu, initializeContextMenuListener } from "./contextMenus";
import {
  initializeCompletionPollingListener,
  setCompletionPollingEnabled,
} from "./listeners/completionNotifications";
import { initializeMessageListener } from "./messages";
import { updateBadge } from "./listeners/updateBadge";
import { maybeNotifyFinishedTasks } from "./listeners/maybeNotifyFinishedTasks";

// Make sure that these all register listeners synchronously!
initializeCompletionPollingListener();
initializeContextMenuListener();
initializeMessageListener();

onPersistentStateChange("settings", async ({ settings }) => {
  try {
    await setCompletionPollingEnabled(settings.notifications.enableCompletionNotifications);
    updateBadge(settings, await SessionState.get());
  } catch (error) {
    saveLastSevereError(error);
  }
});
onSessionStateChange(
  "tasks",
  "taskFetchFailureReason",
  "tasksLastInitiatedFetchTimestamp",
  "tasksLastCompletedFetchTimestamp",
  async (taskState: TaskState) => {
    try {
      const persistentState = await PersistentState.get();
      if (persistentState != null) {
        updateBadge(persistentState.settings, taskState);
        await maybeNotifyFinishedTasks(persistentState.settings, taskState);
      }
    } catch (error) {
      saveLastSevereError(error);
    }
  },
);

browser.runtime.onInstalled.addListener(async () => {
  try {
    // The only way we permit other code to get at the persisted state is through a listener which
    // checks the migration version and no-ops if it isn't updated. Which means that if it needs an
    // update, we will write back to storage and trigger those listeners again, now with the correct
    // data shape.
    await migratePersistentState();
    // Clear any session state -- unsure if this happens automatically on extension update within
    // a single browser lifetime, but we want it to to keep it simple.
    await SessionState.clear();
  } catch (e) {
    // n.b. a failed migration is "permanent". Migrations are short, simple and synchronous. This
    // should really never happen, and if it does, "uninstall and reinstall" is an acceptable user
    // experience.
    saveLastSevereError(e, "could not initialize stored state");
    return;
  }

  // Menu items outlive the background context, so they are created once here rather than on every
  // start. Remove all to start with a clean slate on any feature update.
  await browser.contextMenus.removeAll();
  createContextMenu();
});

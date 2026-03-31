import { onStoredStateChange } from "../common/state/listen";
import { maybeMigrateState } from "../common/state/migrate";
import { saveLastSevereError, setupGlobalErrorHandler } from "../common/errorHandlers";

setupGlobalErrorHandler();
import { onStoredStateChange as onStoredStateChangeListener } from "./onStateChange";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";
import { getMutableStateSingleton, settingsReady } from "./backgroundState";
import { pollTasks } from "./actions/pollTasks";

// Message handler must be registered at top level so messages are never missed
// when the event page wakes up.
initializeMessageHandler();

// Alarm listener must be top-level so the background script wakes for it.
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "poll-tasks") {
    settingsReady.then(() => {
      const { api, pollRequestManager } = getMutableStateSingleton();
      pollTasks(api, pollRequestManager);
    });
  }
});

// Context menus persist across restarts, so only register on install/update.
browser.runtime.onInstalled.addListener(() => {
  initializeContextMenus();
});

maybeMigrateState()
  .then(() => {
    onStoredStateChange(onStoredStateChangeListener);
  })
  .catch(saveLastSevereError);

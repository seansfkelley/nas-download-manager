import "../common/init/nonContentContext";
import { onStoredStateChange } from "../common/state";
import { onStoredStateChange as onStoredStateChangeListener } from "./onStateChange";
import { createContextMenu, initializeContextMenuHandler } from "./contextMenus";
import { initializeAlarmHandler } from "./alarms";
import { initializeMessageHandler } from "./messages";

// Everything here registers its listeners synchronously. A non-persistent background context wakes
// for an event and drops it if nothing is listening by the end of this evaluation.
initializeAlarmHandler();
initializeContextMenuHandler();
initializeMessageHandler();
onStoredStateChange(onStoredStateChangeListener);

browser.runtime.onInstalled.addListener(async () => {
  // Menu items outlive the background context, so they are created once here rather than on every
  // start. removeAll first because onInstalled also fires for browser updates, and creating an id
  // that already exists is an error.
  await browser.contextMenus.removeAll();
  createContextMenu();
});

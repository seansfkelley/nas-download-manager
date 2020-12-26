import "../common/init/extensionContext";
import { onStoredStateChange, maybeMigrateState } from "../common/state";
import { onUnhandledError } from "../common/errorHandlers";
import { onStoredStateChange as onStoredStateChangeListener } from "./onStateChange";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";

initializeContextMenus();
initializeMessageHandler();

maybeMigrateState()
  .then(() => {
    onStoredStateChange(onStoredStateChangeListener);
  })
  .catch(onUnhandledError);

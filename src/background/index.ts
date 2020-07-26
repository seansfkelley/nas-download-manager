import "../common/init/extensionContext";
import { onStoredStateChange, updateStateShapeIfNecessary } from "../common/state";
import { onUnhandledError } from "../common/errorHandlers";
import { onStoredStateChange as onStoredStateChangeListener } from "./onStateChange";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";

initializeContextMenus();
initializeMessageHandler();

updateStateShapeIfNecessary()
  .then(() => {
    onStoredStateChange(onStoredStateChangeListener);
  })
  .catch(onUnhandledError);

import "../common/init/extensionContext";
import { getMutableStateSingleton } from "./backgroundState";
import { onStoredStateChange, updateStateShapeIfNecessary } from "../common/state";
import { setSharedObjects } from "../common/apis/sharedObjects";
import { onUnhandledError } from "../common/errorHandlers";
import { onStoredStateChange as onStoredStateChangeListener } from "./onStateChange";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";

setSharedObjects({ api: getMutableStateSingleton().api });

initializeContextMenus();
initializeMessageHandler();

updateStateShapeIfNecessary()
  .then(() => {
    onStoredStateChange(onStoredStateChangeListener);
  })
  .catch(onUnhandledError);

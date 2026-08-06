import "../common/init/nonContentContext";
import { onStoredStateChange } from "../common/state";
import { onStoredStateChange as onStoredStateChangeListener } from "./onStateChange";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";

initializeContextMenus();
initializeMessageHandler();
onStoredStateChange(onStoredStateChangeListener);

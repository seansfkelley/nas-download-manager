import "../common/init/nonContentContext";
import { onStoredStateChange, maybeMigrateState } from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";
import { onStoredStateChange as onStoredStateChangeListener } from "./onStateChange";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";

initializeContextMenus();
initializeMessageHandler();

maybeMigrateState()
  .then(() => {
    onStoredStateChange(onStoredStateChangeListener);
  })
  .catch(saveLastSevereError);

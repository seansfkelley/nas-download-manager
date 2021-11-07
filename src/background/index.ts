import "../common/init/nonContentContext";
import { onStoredStateChange, maybeMigrateState } from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";
import { updateStateSingleton } from "./backgroundState";

initializeContextMenus();
initializeMessageHandler();

maybeMigrateState()
  .then(() => {
    onStoredStateChange((storedState) => {
      updateStateSingleton({ settings: storedState.settings });
    });
  })
  .catch(saveLastSevereError);

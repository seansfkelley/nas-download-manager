import "../common/init/nonContentContext";
import { onStoredStateChange, maybeMigrateState } from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";
import { getStateSingleton } from "./backgroundState";

initializeContextMenus();
initializeMessageHandler();

maybeMigrateState()
  .then(() => {
    onStoredStateChange((storedState) => {
      getStateSingleton().updateSettings(storedState.settings);
    });
  })
  .catch(saveLastSevereError);

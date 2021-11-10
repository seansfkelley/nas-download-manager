import "../common/init/nonContentContext";
import { onStoredStateChange, maybeMigrateState } from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";
import { getState } from "./backgroundState";

initializeContextMenus();
initializeMessageHandler();

maybeMigrateState()
  .then(() => {
    onStoredStateChange((storedState) => {
      getState().updateSettings(storedState.settings);
    });
  })
  .catch(saveLastSevereError);

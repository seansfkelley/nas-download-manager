import "../common/init/nonContentContext";
import { onStoredStateChange, maybeMigrateState } from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";
import { initializeListeners } from "./listeners/initialize";
import { getStateSingleton } from "./backgroundState";

initializeContextMenus();
initializeMessageHandler();
initializeListeners();

maybeMigrateState()
  .then(() => {
    onStoredStateChange((storedState) => {
      getStateSingleton().updateSettings(storedState.settings);
    });
  })
  .catch(saveLastSevereError);

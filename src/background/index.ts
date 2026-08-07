import "../common/init/nonContentContext";
import { reactToPersistentState, PersistentState, SessionState } from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";
import { initializeContextMenus } from "./contextMenus";
import { initializeMessageHandler } from "./messages";
import { migrateState } from "../common/state/migrations/update";
import { updateCredentials } from "./listeners/updateCredentials";
import { updateBadge } from "./listeners/updateBadge";
import { updateBackgroundSettings } from "./listeners/updateBackgroundSettings";
import { maybeNotifyCompletedDownloads } from "./listeners/maybeNotifyCompletedDownloads";

initializeContextMenus();
initializeMessageHandler();

(async () => {
  try {
    const updated = migrateState(await browser.storage.local.get(null));
    PersistentState.set(updated);

    reactToPersistentState("settings", async ({ settings }) => {
      await updateCredentials(settings);
      await updateBackgroundSettings(settings);

      let sessionState = await SessionState.get();
      await updateBadge(settings, sessionState);
      await maybeNotifyCompletedDownloads(settings, sessionState);
    });
  } catch (error) {
    saveLastSevereError(error);
  }
})();

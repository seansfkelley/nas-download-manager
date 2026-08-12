import { saveLastSevereError } from "../../common/errorHandlers";
import { SessionState } from "../../common/state";

import { DOWNLOAD_MENU_ITEM_ID } from "./registerContextMenus";

export function registerRuntimeInstalled() {
  browser.runtime.onInstalled.addListener(async () => {
    // The session state carries no version and no migrations; this is what makes that safe.
    try {
      await SessionState.clear();
    } catch (error) {
      saveLastSevereError(error);
    }

    browser.contextMenus.create({
      id: DOWNLOAD_MENU_ITEM_ID,
      enabled: true,
      title: browser.i18n.getMessage("Download_with_DownloadStation"),
      contexts: ["link", "audio", "video", "image", "selection"],
    });
  });
}

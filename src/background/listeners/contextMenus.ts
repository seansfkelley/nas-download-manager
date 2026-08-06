import { notify } from "../../common/notify";

import { addDownloadTasksAndPoll } from "../actions";
import { ALL_DOWNLOADABLE_PROTOCOLS, startsWithAnyProtocol } from "../../common/apis/protocols";
import { getSynologyClient } from "../getSynologyClient";
import { PersistentState } from "../../common/state";
import { saveLastSevereError } from "../../common/errorHandlers";

const MENU_ITEM_ID = "download-with-download-station";

export function createContextMenu() {
  browser.contextMenus.create({
    id: MENU_ITEM_ID,
    enabled: true,
    title: browser.i18n.getMessage("Download_with_DownloadStation"),
    contexts: ["link", "audio", "video", "image", "selection"],
  });
}

export function initializeContextMenuListener() {
  browser.contextMenus.onClicked.addListener(async (data) => {
    if (data.menuItemId !== MENU_ITEM_ID) {
      return;
    }

    try {
      const client = await getSynologyClient();
      const showNonErrorNotifications =
        (await PersistentState.get())?.settings.notifications.enableFeedbackNotifications ?? false;

      if (data.linkUrl) {
        return addDownloadTasksAndPoll(client, showNonErrorNotifications, [data.linkUrl]);
      } else if (data.srcUrl) {
        return addDownloadTasksAndPoll(client, showNonErrorNotifications, [data.srcUrl]);
      } else if (data.selectionText) {
        let urls = data.selectionText
          .split("\n")
          .map((url) => url.trim())
          // The cheapest of checks. Actual invalid URLs will be caught later.
          .filter((url) => startsWithAnyProtocol(url, ALL_DOWNLOADABLE_PROTOCOLS));

        if (urls.length == 0) {
          notify(
            browser.i18n.getMessage("Failed_to_add_download"),
            browser.i18n.getMessage("Selected_text_is_not_a_valid_URL"),
            "failure",
          );
        } else {
          return addDownloadTasksAndPoll(client, showNonErrorNotifications, urls);
        }
      } else {
        notify(
          browser.i18n.getMessage("Failed_to_add_download"),
          browser.i18n.getMessage("URL_is_empty_or_missing"),
          "failure",
        );
      }
      return undefined;
    } catch (error) {
      saveLastSevereError(error);
    }
  });
}

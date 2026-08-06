import { getMutableStateSingleton } from "./backgroundState";
import { notify } from "../common/notify";

import { addDownloadTasksAndPoll } from "./actions";
import { ALL_DOWNLOADABLE_PROTOCOLS, startsWithAnyProtocol } from "../common/apis/protocols";

// Stable rather than generated, so creating the item is idempotent and the click handler can tell
// which item fired.
const MENU_ITEM_ID = "download-with-download-station";

export function createContextMenu() {
  browser.contextMenus.create({
    id: MENU_ITEM_ID,
    enabled: true,
    title: browser.i18n.getMessage("Download_with_DownloadStation"),
    contexts: ["link", "audio", "video", "image", "selection"],
  });
}

export function initializeContextMenuHandler() {
  browser.contextMenus.onClicked.addListener((data) => {
    if (data.menuItemId !== MENU_ITEM_ID) {
      return;
    }

    const state = getMutableStateSingleton();

    if (data.linkUrl) {
      addDownloadTasksAndPoll(state.api, state.showNonErrorNotifications, [data.linkUrl]);
    } else if (data.srcUrl) {
      addDownloadTasksAndPoll(state.api, state.showNonErrorNotifications, [data.srcUrl]);
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
        addDownloadTasksAndPoll(state.api, state.showNonErrorNotifications, urls);
      }
    } else {
      notify(
        browser.i18n.getMessage("Failed_to_add_download"),
        browser.i18n.getMessage("URL_is_empty_or_missing"),
        "failure",
      );
    }
  });
}

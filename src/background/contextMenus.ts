import { ALL_DOWNLOADABLE_PROTOCOLS, startsWithAnyProtocol } from "../common/apis/protocols";
import { SynologyClient } from "../common/apis/synology";
import { notify } from "../common/notify";

import { addDownloadTasksAndFetch } from "./actions";

// Stable, because the item is created once per install rather than once per background startup.
const DOWNLOAD_MENU_ITEM_ID = "download-with-download-station";

export function initializeContextMenus(client: SynologyClient) {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: DOWNLOAD_MENU_ITEM_ID,
      enabled: true,
      title: browser.i18n.getMessage("Download_with_DownloadStation"),
      contexts: ["link", "audio", "video", "image", "selection"],
    });
  });

  browser.contextMenus.onClicked.addListener((data) => {
    if (data.menuItemId !== DOWNLOAD_MENU_ITEM_ID) {
      return;
    }

    if (data.linkUrl) {
      addDownloadTasksAndFetch(client, [data.linkUrl]);
    } else if (data.srcUrl) {
      addDownloadTasksAndFetch(client, [data.srcUrl]);
    } else if (data.selectionText) {
      const urls = data.selectionText
        .split("\n")
        .map((url) => url.trim())
        // The cheapest of checks. Actual invalid URLs will be caught later.
        .filter((url) => startsWithAnyProtocol(url, ALL_DOWNLOADABLE_PROTOCOLS));

      if (urls.length === 0) {
        notify(
          browser.i18n.getMessage("Failed_to_add_download"),
          browser.i18n.getMessage("Selected_text_is_not_a_valid_URL"),
          "failure",
        );
      } else {
        addDownloadTasksAndFetch(client, urls);
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

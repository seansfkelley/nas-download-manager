import { ALL_DOWNLOADABLE_PROTOCOLS, startsWithAnyProtocol } from "../../common/apis/protocols";
import { sendNotification } from "../../common/sendNotification";
import { addDownloadTasksAndFetch } from "../actions";

export const DOWNLOAD_MENU_ITEM_ID = "download-with-download-station";

export function registerContextMenus() {
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
        sendNotification(
          browser.i18n.getMessage("Failed_to_add_download"),
          browser.i18n.getMessage("Selected_text_is_not_a_valid_URL"),
          "failure",
        );
      } else {
        addDownloadTasksAndFetch(client, urls);
      }
    } else {
      sendNotification(
        browser.i18n.getMessage("Failed_to_add_download"),
        browser.i18n.getMessage("URL_is_empty_or_missing"),
        "failure",
      );
    }
  });
}

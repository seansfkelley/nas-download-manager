import { notify } from "../common/notify";
import { addDownloadTasksAndReload } from "./actions";
import { ALL_DOWNLOADABLE_PROTOCOLS, startsWithAnyProtocol } from "../common/apis/protocols";

export function initializeContextMenus() {
  browser.contextMenus.create({
    enabled: true,
    title: browser.i18n.getMessage("Download_with_DownloadStation"),
    contexts: ["link", "audio", "video", "image", "selection"],
    onclick: (data) => {
      if (data.linkUrl) {
        addDownloadTasksAndReload([data.linkUrl]);
      } else if (data.srcUrl) {
        addDownloadTasksAndReload([data.srcUrl]);
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
          addDownloadTasksAndReload(urls);
        }
      } else {
        notify(
          browser.i18n.getMessage("Failed_to_add_download"),
          browser.i18n.getMessage("URL_is_empty_or_missing"),
          "failure",
        );
      }
    },
  });
}

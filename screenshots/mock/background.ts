import { positionWindow } from "./geometry";

// The contextMenus.create call is duplicated from registerRuntimeInstalled rather than imported:
// that module pulls in the whole background action graph, and this is the only part of it a
// screenshot needs.
browser.runtime.onInstalled.addListener(async () => {
  browser.contextMenus.create({
    id: "download-with-download-station",
    enabled: true,
    title: browser.i18n.getMessage("Download_with_DownloadStation"),
    contexts: ["link", "audio", "video", "image", "selection"],
  });

  // Opened from here because the page's own URL is the only way to reach it: Firefox mints a fresh
  // moz-extension UUID for every throwaway profile, so it cannot be written down anywhere.
  await browser.tabs.create({ url: browser.runtime.getURL("links.html") });

  await positionWindow();
});

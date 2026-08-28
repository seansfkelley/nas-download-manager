import type { Directory, Message, MessageResponse } from "../../src/common/apis/messages";
import type { DownloadStationInfoConfig } from "../../src/common/apis/synology/DownloadStation/Info";

const CONFIG: DownloadStationInfoConfig = {
  bt_max_download: 0,
  bt_max_upload: 0,
  emule_max_download: 0,
  emule_max_upload: 0,
  nzb_max_download: 0,
  http_max_download: 0,
  ftp_max_download: 0,
  emule_enabled: false,
  unzip_service_enabled: true,
  default_destination: "video",
  emule_default_destination: "",
};

const DIRECTORIES: Record<string, Directory[]> = {
  "/": [
    { name: "downloads", path: "/downloads" },
    { name: "music", path: "/music" },
    { name: "photo", path: "/photo" },
    { name: "video", path: "/video" },
  ],
  "/downloads": [
    { name: "incomplete", path: "/downloads/incomplete" },
    { name: "isos", path: "/downloads/isos" },
  ],
  "/video": [
    { name: "movies", path: "/video/movies" },
    { name: "tv", path: "/video/tv" },
  ],
};

function respond(message: Message): Promise<unknown> {
  switch (message.type) {
    case "get-config":
      return Promise.resolve({
        success: true,
        result: CONFIG,
      } satisfies MessageResponse<DownloadStationInfoConfig>);
    case "list-directories":
      return Promise.resolve({
        success: true,
        result: DIRECTORIES[message.path ?? "/"] ?? [],
      } satisfies MessageResponse<Directory[]>);
    default:
      throw new Error(`the mock extension has no answer for a ${message.type} message`);
  }
}

// defineProperty rather than assignment: Firefox exposes the API namespaces as accessor properties
// with no setter, so `browser.runtime.sendMessage = ...` throws under a module's strict mode.
Object.defineProperty(browser.runtime, "sendMessage", {
  value: respond,
  writable: true,
  configurable: true,
});

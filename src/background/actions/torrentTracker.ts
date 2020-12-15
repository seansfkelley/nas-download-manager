import Axios from "axios";
import { startsWithAnyProtocol, MAGNET_PROTOCOL } from "../../common/apis/protocols";
import type { State } from "../../common/state";

let cachedTrackers: string[] = [];
let lastPublicTrackerURL = "";

export async function updateAndGetTorrentTrackers(storedState: State): Promise<string[]> {

  let response;

  const flag = storedState.settings.torrentTrackers.enablePublicTrackers;
  const url = storedState.settings.torrentTrackers.publicTrackerURL;

  if (flag && url !== lastPublicTrackerURL) {

    try {
      response = await Axios.get(url, { timeout: 10000 });
      lastPublicTrackerURL = url;
    } catch (e) {
      cachedTrackers = [];
    }

    const trackerText: string = response?.data?.toString();

    if (trackerText !== "") {
      if (trackerText.includes(',')) {
        cachedTrackers = trackerText.split(',')
      } else if (trackerText.includes("\n\n")) {
        cachedTrackers = trackerText.split("\n\n")
      } else {
        cachedTrackers = trackerText.split("\n")
      }
    }
  }

  return cachedTrackers;
}

export function addTrackersToURL(url: string): string {
  if (startsWithAnyProtocol(url, MAGNET_PROTOCOL)) {
    url += url.includes("?") ? "" : "?";
    cachedTrackers.forEach(t => {
      url += "&tr=" + encodeURIComponent(t)
    })
  }
  return url;
}

export function addTrackersToMetaData(metaData: Blob): Blob {
  return metaData;
}
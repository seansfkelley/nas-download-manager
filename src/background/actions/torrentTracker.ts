import Axios from "axios";
import bencodec from "bencodec";
import { startsWithAnyProtocol, MAGNET_PROTOCOL } from "../../common/apis/protocols";
import type { State } from "../../common/state";

let cachedTrackers: string[] = [];
let lastPublicTrackerURL = "";

async function updateRemoteTrackers(url: string) {
  let response;

  try {
    response = await Axios.get(url, { timeout: 10000 });
    lastPublicTrackerURL = url;
  } catch (e) {
    console.log("Axios Error caught when updating public trackers:", e);
    cachedTrackers = [];
  }

  const trackerText: string = response?.data?.toString();

  if (trackerText !== "") {
    if (trackerText.includes(",")) {
      cachedTrackers = trackerText.split(",");
    } else if (trackerText.includes("\n\n")) {
      cachedTrackers = trackerText.split("\n\n");
    } else {
      cachedTrackers = trackerText.split("\n");
    }
    console.log("successfully updated public trackers:", cachedTrackers.length);
  }
}

export function updateAndGetTorrentTrackers(storedState: State): string[] {
  console.debug("updateAndGetTorrentTrackers was called", new Error().stack);
  console.debug("cached trackers:", cachedTrackers.length);

  const flag = storedState.settings.torrentTrackers.enablePublicTrackers;
  const url = storedState.settings.torrentTrackers.publicTrackerURL;

  if (flag && url !== lastPublicTrackerURL) {
    updateRemoteTrackers(url);
  }

  return cachedTrackers;
}

export function setTrackers(trackers: string[]) {
  cachedTrackers = trackers;
}

export function addTrackersToURL(url: string): string {
  if (startsWithAnyProtocol(url, MAGNET_PROTOCOL)) {
    url += url.includes("?") ? "" : "?";
    cachedTrackers.some((t, i) => {
      if (i >= 50) return true; // make sure uri is not too large
      url += "&tr=" + encodeURIComponent(t);
      return false;
    });
  }
  return url;
}

export function addTrackersToMetaData(metaData: Buffer) {
  const torrent: any = bencodec.decode(metaData);
  cachedTrackers.forEach((t) => {
    torrent["announce-list"].push([Buffer.from(t, "utf8")]);
  });
  return bencodec.encode(torrent);
}

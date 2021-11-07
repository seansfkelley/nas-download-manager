import type { CommonBackgroundState, Downloads } from "../backgroundState";

let lastDownloads: Readonly<Downloads> | undefined;

export function onChange(state: CommonBackgroundState) {
  if (state.downloads !== lastDownloads) {
    // TODO: Broadcast a message!
    lastDownloads = state.downloads;
  }
}

import { ApiClient } from "synology-typescript-api";

export interface SharedObjects {
  api: ApiClient;
}

export async function setSharedObjects(objects: SharedObjects) {
  if (browser.runtime.getBackgroundPage != null) {
    const window = await browser.runtime.getBackgroundPage();
    (window as any).__sharedObjects = objects;
  } else {
    throw new Error("cannot get background page in this environment");
  }
}

export async function getSharedObjects() {
  if (browser.runtime.getBackgroundPage != null) {
    const window = await browser.runtime.getBackgroundPage();
    if (window) {
      return (window as any).__sharedObjects as (SharedObjects | undefined);
    } else {
      return undefined;
    }
  } else {
    throw new Error("cannot get background page in this environment");
  }
}

import { ApiClient } from "synology-typescript-api";

export interface SharedObjects {
  api: ApiClient;
}

export function setSharedObjects(objects: SharedObjects) {
  if (browser.runtime.getBackgroundPage != null) {
    return browser.runtime.getBackgroundPage().then(window => {
      (window as any).__sharedObjects = objects;
    });
  } else {
    return Promise.reject(new Error("cannot get background page in this environment"));
  }
}

export function getSharedObjects() {
  if (browser.runtime.getBackgroundPage != null) {
    return browser.runtime.getBackgroundPage().then(window => {
      if (window) {
        return (window as any).__sharedObjects as (SharedObjects | undefined);
      } else {
        return undefined;
      }
    });
  } else {
    return Promise.reject(new Error("cannot get background page in this environment"));
  }
}

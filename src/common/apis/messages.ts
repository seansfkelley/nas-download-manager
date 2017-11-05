import { ApiClient } from 'synology-typescript-api';

export interface SharedObjects {
  api: ApiClient;
}

export function setSharedObjects(objects: SharedObjects) {
  return browser.runtime.getBackgroundPage()
    .then(window => {
      (window as any).__sharedObjects = objects;
    });
}

export function getSharedObjects() {
  return browser.runtime.getBackgroundPage()
    .then(window => {
      return (window as any).__sharedObjects as (SharedObjects | undefined);
    });
}

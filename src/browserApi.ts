import { uniqueId } from 'lodash-es';
import { ApiClient } from 'synology-typescript-api';

export function notify(title: string, message?: string, id: string = uniqueId('notification-')) {
  browser.notifications.create(id, {
    type: 'basic',
    title,
    message: message || '',
    iconUrl: browser.extension.getURL('icons/icon-64.png')
  });
  return id;
}

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

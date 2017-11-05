import { ApiClient } from 'synology-typescript-api';

export interface SharedObjects {
  api: ApiClient;
}

export function setSharedObjects(objects: SharedObjects) {
  if (browser.runtime.getBackgroundPage != null) {
    return browser.runtime.getBackgroundPage()
      .then(window => {
        (window as any).__sharedObjects = objects;
      });
  } else {
    return Promise.reject(new Error('cannot get background page in this environment'));
  }
}

export function getSharedObjects() {
  if (browser.runtime.getBackgroundPage != null) {
    return browser.runtime.getBackgroundPage()
      .then(window => {
        return (window as any).__sharedObjects as (SharedObjects | undefined);
      });
  } else {
    return Promise.reject(new Error('cannot get background page in this environment'));
  }
}

export const ADD_TASK_MESSAGE_TYPE = 'add-task';

export interface AddTaskMessage {
  type: typeof ADD_TASK_MESSAGE_TYPE;
  url: string;
}

export function isAddTaskMessage(message: object | null | undefined): message is AddTaskMessage {
  return message != null && (message as any).type === ADD_TASK_MESSAGE_TYPE;
}

export function sendTaskAddMessage(url: string) {
  const addTaskMessage = {
    type: ADD_TASK_MESSAGE_TYPE,
    url
  };
  browser.runtime.sendMessage(addTaskMessage);
}

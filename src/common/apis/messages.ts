export const ADD_TASKS_MESSAGE_TYPE = "add-task" as const;

export interface AddTasksMessage {
  type: typeof ADD_TASKS_MESSAGE_TYPE;
  urls: string[];
  path?: string;
}

export function isAddTasksMessage(message: object | null | undefined): message is AddTasksMessage {
  return message != null && (message as any).type === ADD_TASKS_MESSAGE_TYPE;
}

export function sendAddTasksMessage(urls: string[], path?: string) {
  const message: AddTasksMessage = {
    type: ADD_TASKS_MESSAGE_TYPE,
    urls,
    path,
  };
  browser.runtime.sendMessage(message);
}

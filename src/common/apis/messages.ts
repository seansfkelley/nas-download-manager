export const ADD_TASK_MESSAGE_TYPE = "add-task" as const;

export interface AddTaskMessage {
  type: typeof ADD_TASK_MESSAGE_TYPE;
  url: string;
}

export function isAddTaskMessage(message: object | null | undefined): message is AddTaskMessage {
  return message != null && (message as any).type === ADD_TASK_MESSAGE_TYPE;
}

export function sendAddTaskMessage(url: string) {
  const addTaskMessage = {
    type: ADD_TASK_MESSAGE_TYPE,
    url,
  };
  browser.runtime.sendMessage(addTaskMessage);
}

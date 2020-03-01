export enum MessageType {
  ADD_TASKS,
  POLL_TASKS,
}

export interface AddTasksMessage {
  type: typeof MessageType.ADD_TASKS;
  urls: string[];
  path?: string;
}

export const AddTasksMessage = {
  send: (urls: string[], path?: string) => {
    const message: AddTasksMessage = {
      type: MessageType.ADD_TASKS,,
      urls,
      path,
    };
    browser.runtime.sendMessage(message);
  },
  is: (message: object | null | undefined): message is AddTasksMessage => {
    return message != null && (message as any).type === MessageType.ADD_TASKS;
  }
}

export interface PollTasksMessage {
  type: typeof MessageType.POLL_TASKS;
}

export const PollTasksMessage = {
  send: () => {
    const message: PollTasksMessage = {
      type: MessageType.POLL_TASKS,
    };
    browser.runtime.sendMessage(message);
  },
  is: (message: object | null | undefined): message is PollTasksMessage => {
    return message != null && (message as any).type === MessageType.POLL_TASKS;
  }
}

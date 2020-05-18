export enum MessageType {
  ADD_TASKS,
  POLL_TASKS,
  PAUSE_TASK,
  RESUME_TASK,
  DELETE_TASK,
}

interface Message<T extends MessageType> {
  type: T;
}

function makeTypeGuard<T extends Message<MessageType>>(type: T["type"]) {
  return (m: object | null | undefined): m is T => {
    return m != null && (m as any).type == type;
  };
}

function sendMessage<T extends Message<MessageType>>(m: T) {
  browser.runtime.sendMessage(m);
}

export interface AddTasksMessage extends Message<MessageType.ADD_TASKS> {
  urls: string[];
  path?: string;
}

export const AddTasksMessage = {
  send: (urls: string[], path?: string) => {
    sendMessage<AddTasksMessage>({
      type: MessageType.ADD_TASKS,
      urls,
      path,
    });
  },
  is: makeTypeGuard<AddTasksMessage>(MessageType.ADD_TASKS),
};

export interface PollTasksMessage extends Message<MessageType.POLL_TASKS> {}

export const PollTasksMessage = {
  send: () => {
    sendMessage<PollTasksMessage>({
      type: MessageType.POLL_TASKS,
    });
  },
  is: makeTypeGuard<PollTasksMessage>(MessageType.POLL_TASKS),
};

export interface PauseTaskMessage extends Message<MessageType.PAUSE_TASK> {
  taskId: string;
}

export const PauseTaskMessage = {
  send: (taskId: string) => {
    sendMessage<PauseTaskMessage>({
      type: MessageType.PAUSE_TASK,
      taskId,
    });
  },
  is: makeTypeGuard<PauseTaskMessage>(MessageType.PAUSE_TASK),
};

export interface ResumeTaskMessage extends Message<MessageType.RESUME_TASK> {
  taskId: string;
}

export const ResumeTaskMessage = {
  send: (taskId: string) => {
    sendMessage<ResumeTaskMessage>({
      type: MessageType.RESUME_TASK,
      taskId,
    });
  },
  is: makeTypeGuard<ResumeTaskMessage>(MessageType.RESUME_TASK),
};

export interface DeleteTaskMessage extends Message<MessageType.DELETE_TASK> {
  taskId: string;
}

export const DeleteTaskMessage = {
  send: (taskId: string) => {
    sendMessage<DeleteTaskMessage>({
      type: MessageType.DELETE_TASK,
      taskId,
    });
  },
  is: makeTypeGuard<DeleteTaskMessage>(MessageType.DELETE_TASK),
};

export interface AddTasksMessage {
  type: "add-tasks";
  urls: string[];
  path?: string;
}

export interface PollTasksMessage {
  type: "poll-tasks";
}

export interface PauseTaskMessage {
  type: "pause-task";
  taskId: string;
}

export interface ResumeTaskMessage {
  type: "resume-task";
  taskId: string;
}

export interface DeleteTaskMessage {
  type: "delete-task";
  taskId: string;
}

export type Message =
  | AddTasksMessage
  | PollTasksMessage
  | PauseTaskMessage
  | ResumeTaskMessage
  | DeleteTaskMessage;

export type MessageType = Message["type"];

// Pick the union member that matches the given discriminant.
// from: https://stackoverflow.com/questions/48750647/get-type-of-union-by-discriminant
type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = T extends Record<K, V> ? T : never;

function makeMessageOperations<T extends MessageType, U extends any[]>(
  type: T,
  payload: (...args: U) => Omit<DiscriminateUnion<Message, "type", T>, "type">,
) {
  return {
    send: (...args: U) => {
      browser.runtime.sendMessage({
        type,
        ...payload(...args),
      });
    },
    is: (m: object | null | undefined): m is DiscriminateUnion<Message, "type", T> => {
      return m != null && (m as any).type == type;
    },
  };
}

export const AddTasksMessage = makeMessageOperations(
  "add-tasks",
  (urls: string[], path?: string) => ({ urls, path }),
);

export const PollTasksMessage = makeMessageOperations("poll-tasks", () => ({}));

export const PauseTaskMessage = makeMessageOperations("pause-task", (taskId: string) => ({
  taskId,
}));

export const ResumeTaskMessage = makeMessageOperations("resume-task", (taskId: string) => ({
  taskId,
}));

export const DeleteTaskMessage = makeMessageOperations("delete-task", (taskId: string) => ({
  taskId,
}));

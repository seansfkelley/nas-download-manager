export type CallbackResponse = "success" | { failMessage: string };

export interface AddTasks {
  type: "add-tasks";
  urls: string[];
  path?: string;
}

export interface PollTasks {
  type: "poll-tasks";
}

export interface PauseTask {
  type: "pause-task";
  taskId: string;
}

export interface ResumeTask {
  type: "resume-task";
  taskId: string;
}

export interface DeleteTasks {
  type: "delete-tasks";
  taskIds: string[];
}

export type Message = AddTasks | PollTasks | PauseTask | ResumeTask | DeleteTasks;

const MESSAGE_TYPES: Record<Message["type"], true> = {
  "add-tasks": true,
  "delete-tasks": true,
  "pause-task": true,
  "poll-tasks": true,
  "resume-task": true,
};

export const Message = {
  is: (m: object | null | undefined): m is Message => {
    return (
      m != null && (m as any).type != null && MESSAGE_TYPES[(m as any).type as Message["type"]]
    );
  },
};

export type Result = {
  "add-tasks": void;
  "poll-tasks": void;
  "pause-task": CallbackResponse;
  "resume-task": CallbackResponse;
  "delete-tasks": CallbackResponse;
};

// Pick the union member that matches the given discriminant.
// from: https://stackoverflow.com/questions/48750647/get-type-of-union-by-discriminant
export type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = T extends Record<K, V>
  ? T
  : never;

function makeMessageOperations<T extends Message["type"], U extends any[]>(
  type: T,
  payload: (...args: U) => Omit<DiscriminateUnion<Message, "type", T>, "type">,
) {
  return {
    send: (...args: U) => {
      return browser.runtime.sendMessage({
        type,
        ...payload(...args),
      }) as Promise<Result[T]>;
    },
    is: (m: object | null | undefined): m is DiscriminateUnion<Message, "type", T> => {
      return m != null && (m as any).type == type;
    },
  };
}

export const AddTasks = makeMessageOperations("add-tasks", (urls: string[], path?: string) => ({
  urls,
  path,
}));

export const PollTasks = makeMessageOperations("poll-tasks", () => ({}));

export const PauseTask = makeMessageOperations("pause-task", (taskId: string) => ({
  taskId,
}));

export const ResumeTask = makeMessageOperations("resume-task", (taskId: string) => ({
  taskId,
}));

export const DeleteTasks = makeMessageOperations("delete-tasks", (taskIds: string[]) => ({
  taskIds,
}));

{
  // Compile-time check to make sure that these two different types that have to match, do.
  let _message: Message["type"] = (null as unknown) as keyof Result;
  let _result: keyof Result = (null as unknown) as Message["type"];
  // Get the compiler to shutup.
  _message = _result;
  _result = _message;
}

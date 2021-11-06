import type { DiscriminateUnion } from "../types";
import type { DownloadStationInfoConfig } from "./synology/DownloadStation/Info";

export interface SuccessMessageResponse<T> {
  success: true;
  // This field must be mandatory; if it isn't, type inference at usage sites can be unsafe because
  // it is too lenient with structural matching. The generic constraint does nothing if you can always
  // just leave all (or in this case, only) constrained values out entirely.
  result: T;
}
export interface FailureMessageResponse {
  success: false;
  reason: string;
}

export type MessageResponse<T = undefined> = SuccessMessageResponse<T> | FailureMessageResponse;

export const MessageResponse = {
  is: (r: unknown | null | undefined): r is MessageResponse => {
    const m = r as MessageResponse | null | undefined;
    return m != null && (m.success === true || (m.success === false && m.reason != null));
  },
};

export interface AddTasks {
  type: "add-tasks";
  urls: string[];
  options: AddTaskOptions;
}

export interface AddTaskOptions {
  path?: string;
  ftpUsername?: string;
  ftpPassword?: string;
  unzipPassword?: string;
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

export interface GetConfig {
  type: "get-config";
}

export interface ListDirectories {
  type: "list-directories";
  path?: string;
}

export interface Directory {
  name: string;
  path: string;
}

export interface SetLoginPassword {
  type: "set-login-password";
  password: string;
}

export type Message =
  | AddTasks
  | PollTasks
  | PauseTask
  | ResumeTask
  | DeleteTasks
  | GetConfig
  | ListDirectories
  | SetLoginPassword;

const MESSAGE_TYPES: Record<Message["type"], true> = {
  "add-tasks": true,
  "delete-tasks": true,
  "pause-task": true,
  "poll-tasks": true,
  "resume-task": true,
  "get-config": true,
  "list-directories": true,
  "set-login-password": true,
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
  "pause-task": MessageResponse;
  "resume-task": MessageResponse;
  "delete-tasks": MessageResponse;
  "get-config": MessageResponse<DownloadStationInfoConfig>;
  "list-directories": MessageResponse<Directory[]>;
  "set-login-password": void;
};

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

export const AddTasks = makeMessageOperations(
  "add-tasks",
  (urls: string[], options: AddTaskOptions = {}) => ({
    urls,
    options,
  }),
);

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

export const GetConfig = makeMessageOperations("get-config", () => ({}));

export const ListDirectories = makeMessageOperations("list-directories", (path?: string) => ({
  path,
}));

export const SetLoginPassword = makeMessageOperations("set-login-password", (password: string) => ({
  password,
}));

{
  // Compile-time check to make sure that these two different types that have to match, do.
  let _message: Message["type"] = (null as unknown) as keyof Result;
  let _result: keyof Result = (null as unknown) as Message["type"];

  // Get the compiler to shut up. These lines don't necessarily catch type errors.
  _message = _result;
  _result = _message;
}

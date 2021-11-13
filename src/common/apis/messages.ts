import type { DownloadStationTask } from "../apis/synology/DownloadStation/Task";
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

export interface TryGetCachedTasks {
  type: "try-get-cached-tasks";
}

export interface LoadTasks {
  type: "load-tasks";
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

export interface ResetClientSession {
  type: "reset-client-session";
}

export type Message =
  | AddTasks
  | TryGetCachedTasks
  | LoadTasks
  | PauseTask
  | ResumeTask
  | DeleteTasks
  | GetConfig
  | ListDirectories
  | ResetClientSession;

export interface Downloads {
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | { failureMessage: string } | undefined;
  tasksLastInitiatedFetchTimestamp: number | undefined;
  tasksLastCompletedFetchTimestamp: number | undefined;
}

const MESSAGE_TYPES: Record<Message["type"], true> = {
  "add-tasks": true,
  "delete-tasks": true,
  "pause-task": true,
  "try-get-cached-tasks": true,
  "load-tasks": true,
  "resume-task": true,
  "get-config": true,
  "list-directories": true,
  "reset-client-session": true,
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
  "try-get-cached-tasks": Downloads | undefined;
  "load-tasks": Downloads;
  "pause-task": MessageResponse;
  "resume-task": MessageResponse;
  "delete-tasks": MessageResponse;
  "get-config": MessageResponse<DownloadStationInfoConfig>;
  "list-directories": MessageResponse<Directory[]>;
  "reset-client-session": void;
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

export const TryGetCachedTasks = makeMessageOperations("try-get-cached-tasks", () => ({}));

export const LoadTasks = makeMessageOperations("load-tasks", () => ({}));

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

export const ResetClientSession = makeMessageOperations("reset-client-session", () => ({}));

{
  // Compile-time check to make sure that these two different types that have to match, do.
  let _message: Message["type"] = (null as unknown) as keyof Result;
  let _result: keyof Result = (null as unknown) as Message["type"];

  // Get the compiler to shut up. These lines don't necessarily catch type errors.
  _message = _result;
  _result = _message;
}

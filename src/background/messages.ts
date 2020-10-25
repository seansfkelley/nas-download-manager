import { SynologyResponse, ConnectionFailure, isConnectionFailure } from "synology-typescript-api";
import {
  errorMessageFromCode,
  errorMessageFromConnectionFailure,
  ErrorNamespace,
} from "../common/apis/errors";
import { MessageResponse, Message, Result } from "../common/apis/messages";
import { addDownloadTasksAndPoll, pollTasks } from "./actions";
import { BackgroundState, getMutableStateSingleton } from "./backgroundState";
import type { DiscriminateUnion } from "../common/types";

type MessageHandler<T extends Message, U extends Result[keyof Result]> = (
  m: T,
  state: BackgroundState,
) => Promise<U>;

type MessageHandlers = {
  [T in Message["type"]]: MessageHandler<DiscriminateUnion<Message, "type", T>, Result[T]>;
};

function toMessageResponse(
  response: SynologyResponse<unknown> | ConnectionFailure,
  errorNamespace: ErrorNamespace,
): MessageResponse;
function toMessageResponse<T, U>(
  response: SynologyResponse<T> | ConnectionFailure,
  errorNamespace: ErrorNamespace,
  extract: (result: T) => U,
): MessageResponse<U>;
function toMessageResponse<T, U>(
  response: SynologyResponse<T> | ConnectionFailure,
  errorNamespace: ErrorNamespace,
  extract?: (result: T) => U,
): MessageResponse<U> {
  if (isConnectionFailure(response)) {
    return {
      success: false,
      reason: errorMessageFromConnectionFailure(response),
    };
  } else if (!response.success) {
    return {
      success: false,
      reason: errorMessageFromCode(response.error.code, errorNamespace),
    };
  } else {
    return {
      success: true,
      // Non-null assert: extract exists iff we are type-parameterized to something other than undefined.
      result: extract?.(response.data)!,
    };
  }
}

const MESSAGE_HANDLERS: MessageHandlers = {
  "add-tasks": (m, state) => {
    return addDownloadTasksAndPoll(
      state.api,
      state.pollRequestManager,
      state.showNonErrorNotifications,
      m.urls,
      m.options,
    );
  },
  "poll-tasks": (_m, state) => {
    return pollTasks(state.api, state.pollRequestManager);
  },
  "pause-task": async (m, state) => {
    const response = toMessageResponse(
      await state.api.DownloadStation.Task.Pause({ id: [m.taskId] }),
      "DownloadStation.Task",
    );
    if (response.success) {
      await pollTasks(state.api, state.pollRequestManager);
    }
    return response;
  },
  "resume-task": async (m, state) => {
    const response = toMessageResponse(
      await state.api.DownloadStation.Task.Resume({ id: [m.taskId] }),
      "DownloadStation.Task",
    );
    if (response.success) {
      await pollTasks(state.api, state.pollRequestManager);
    }
    return response;
  },
  "delete-tasks": async (m, state) => {
    const response = toMessageResponse(
      await state.api.DownloadStation.Task.Delete({ id: m.taskIds, force_complete: false }),
      "DownloadStation.Task",
    );
    if (response.success) {
      await pollTasks(state.api, state.pollRequestManager);
    }
    return response;
  },
  "get-config": async (_m, state) => {
    return toMessageResponse(
      await state.api.DownloadStation.Info.GetConfig(),
      "DownloadStation.Task",
      (data) => data,
    );
  },
  "list-directories": async (m, state) => {
    const { path } = m;
    if (path) {
      return toMessageResponse(
        await state.api.FileStation.List.list({
          folder_path: path,
          sort_by: "name",
          filetype: "dir",
        }),
        "FileStation",
        (data) => data.files,
      );
    } else {
      return toMessageResponse(
        await state.api.FileStation.List.list_share({ sort_by: "name" }),
        "FileStation",
        (data) => data.shares,
      );
    }
  },
  "reset-client-session": (_m, state) => {
    return state.api.Auth.Logout().then(() => undefined);
  },
};

export function initializeMessageHandler() {
  browser.runtime.onMessage.addListener((m) => {
    if (Message.is(m)) {
      return MESSAGE_HANDLERS[m.type](m as any, getMutableStateSingleton());
    } else {
      console.error("received unhandleable message", m);
      return undefined;
    }
  });
}

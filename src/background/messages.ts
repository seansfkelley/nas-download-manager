import { ClientRequestResult } from "../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../common/apis/errors";
import { MessageResponse, Message, Result } from "../common/apis/messages";
import { addDownloadTasksAndReload, loadTasks } from "./actions";
import { CommonBackgroundState, getReadonlyStateSingleton } from "./backgroundState";
import type { DiscriminateUnion } from "../common/types";

type MessageHandler<T extends Message, U extends Result[keyof Result]> = (
  m: T,
  state: CommonBackgroundState,
) => Promise<U>;

type MessageHandlers = {
  [T in Message["type"]]: MessageHandler<DiscriminateUnion<Message, "type", T>, Result[T]>;
};

function toMessageResponse(response: ClientRequestResult<unknown>): MessageResponse;
function toMessageResponse<T, U>(
  response: ClientRequestResult<T>,
  extract: (result: T) => U,
): MessageResponse<U>;
function toMessageResponse<T, U>(
  response: ClientRequestResult<T>,
  extract?: (result: T) => U,
): MessageResponse<U> {
  if (ClientRequestResult.isConnectionFailure(response)) {
    return {
      success: false,
      reason: getErrorForConnectionFailure(response),
    };
  } else if (!response.success) {
    return {
      success: false,
      reason: getErrorForFailedResponse(response),
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
    return addDownloadTasksAndReload(state, m.urls, m.options);
  },
  "poll-tasks": (_m, state) => {
    return loadTasks(state);
  },
  "pause-task": async (m, state) => {
    const response = toMessageResponse(
      await state.api.DownloadStation.Task.Pause({ id: [m.taskId] }),
    );
    if (response.success) {
      await loadTasks(state);
    }
    return response;
  },
  "resume-task": async (m, state) => {
    const response = toMessageResponse(
      await state.api.DownloadStation.Task.Resume({ id: [m.taskId] }),
    );
    if (response.success) {
      await loadTasks(state);
    }
    return response;
  },
  "delete-tasks": async (m, state) => {
    const response = toMessageResponse(
      await state.api.DownloadStation.Task.Delete({ id: m.taskIds, force_complete: false }),
    );
    if (response.success) {
      await loadTasks(state);
    }
    return response;
  },
  "get-config": async (_m, state) => {
    return toMessageResponse(await state.api.DownloadStation.Info.GetConfig(), (data) => data);
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
        (data) => data.files,
      );
    } else {
      return toMessageResponse(
        await state.api.FileStation.List.list_share({ sort_by: "name" }),
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
      return MESSAGE_HANDLERS[m.type](m as any, getReadonlyStateSingleton());
    } else {
      console.error("received unhandleable message", m);
      return undefined;
    }
  });
}

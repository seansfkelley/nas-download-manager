import { getErrorForConnectionFailure, getErrorForFailedResponse } from "../../common/apis/errors";
import { Message, MessageResponse, Result } from "../../common/apis/messages";
import { ClientRequestResult, SynologyClient } from "../../common/apis/synology";
import { SessionState } from "../../common/state";
import type { DiscriminateUnion } from "../../common/types";
import { addDownloadTasksAndFetch, clearCachedTasks, fetchTasks } from "../actions";
import { singleton } from "../clientSingleton";

type MessageHandler<T extends Message, U extends Result[keyof Result]> = (m: T) => Promise<U>;

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
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      result: extract?.(response.data)!,
    };
  }
}

function messageHandlers(client: SynologyClient): MessageHandlers {
  return {
    "add-tasks": (m) => {
      return addDownloadTasksAndFetch(client, m.urls, m.options);
    },
    "fetch-tasks": () => {
      return fetchTasks(client);
    },
    "pause-task": async (m) => {
      const response = toMessageResponse(
        await client.DownloadStation.Task.Pause({ id: [m.taskId] }),
      );
      if (response.success) {
        await fetchTasks(client);
      }
      return response;
    },
    "resume-task": async (m) => {
      const response = toMessageResponse(
        await client.DownloadStation.Task.Resume({ id: [m.taskId] }),
      );
      if (response.success) {
        await fetchTasks(client);
      }
      return response;
    },
    "delete-tasks": async (m) => {
      const response = toMessageResponse(
        await client.DownloadStation.Task.Delete({ id: m.taskIds, force_complete: false }),
      );
      if (response.success) {
        await fetchTasks(client);
      }
      return response;
    },
    "get-config": async () => {
      return toMessageResponse(await client.DownloadStation.Info.GetConfig(), (data) => data);
    },
    "list-directories": async (m) => {
      const { path } = m;
      if (path) {
        return toMessageResponse(
          await client.FileStation.List.list({
            folder_path: path,
            sort_by: "name",
            filetype: "dir",
          }),
          (data) => data.files,
        );
      } else {
        return toMessageResponse(
          await client.FileStation.List.list_share({ sort_by: "name" }),
          (data) => data.shares,
        );
      }
    },
    login: async (m) => {
      // Dump this on the floor; it is a best-effort and we don't want to block on it.
      client.Auth.Logout();

      await SessionState.set({ password: m.password, deviceToken: m.deviceToken });
      await clearCachedTasks();
      await fetchTasks(client);
    },
  };
}

export function registerMessages() {
  const handlers = messageHandlers(singleton);
  browser.runtime.onMessage.addListener((m) => {
    if (Message.is(m)) {
      return handlers[m.type](m as any);
    } else {
      console.error("received unhandleable message", m);
      return undefined;
    }
  });
}

import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../common/apis/errors";
import { MessageResponse, Message, Result } from "../common/apis/messages";
import { ClientRequestResult, ConnectionFailure } from "../common/apis/synology";
import { SessionState } from "../common/state";
import type { DiscriminateUnion } from "../common/types";

import { addDownloadTasksAndFetch, clearCachedTasks, fetchTasks } from "./actions";
import { client, getClientSettings } from "./client";

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

const MESSAGE_HANDLERS: MessageHandlers = {
  "add-tasks": (m) => {
    return addDownloadTasksAndFetch(m.urls, m.options);
  },
  "fetch-tasks": () => {
    return fetchTasks();
  },
  "pause-task": async (m) => {
    const response = toMessageResponse(await client.DownloadStation.Task.Pause({ id: [m.taskId] }));
    if (response.success) {
      await fetchTasks();
    }
    return response;
  },
  "resume-task": async (m) => {
    const response = toMessageResponse(
      await client.DownloadStation.Task.Resume({ id: [m.taskId] }),
    );
    if (response.success) {
      await fetchTasks();
    }
    return response;
  },
  "delete-tasks": async (m) => {
    const response = toMessageResponse(
      await client.DownloadStation.Task.Delete({ id: m.taskIds, force_complete: false }),
    );
    if (response.success) {
      await fetchTasks();
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
  "set-login-password": async (m) => {
    const settings = await getClientSettings();
    const didPasswordChange = ConnectionFailure.is(settings) || settings.passwd !== m.password;

    // Always reset the session! Do it before storing the new password, so that the logout still
    // resolves the credentials that established the session it is ending.
    await client.Auth.Logout();

    await SessionState.set({ password: m.password });

    if (didPasswordChange) {
      await clearCachedTasks();
    }
  },
};

export function initializeMessageHandler() {
  browser.runtime.onMessage.addListener((m) => {
    if (Message.is(m)) {
      return MESSAGE_HANDLERS[m.type](m as any);
    } else {
      console.error("received unhandleable message", m);
      return undefined;
    }
  });
}

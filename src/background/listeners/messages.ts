import { ClientRequestResult } from "../../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import { MessageResponse, Message, Result } from "../../common/apis/messages";
import { addDownloadTasksAndPoll, fetchTasksIntoStorage } from "../actions";
import { clearCachedTasks, PersistentState, SessionState } from "../../common/state";
import { getSynologyClient } from "../getSynologyClient";
import type { DiscriminateUnion } from "../../common/types";
import { saveLastSevereError } from "../../common/errorHandlers";

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
      result: extract?.(response.data)!,
    };
  }
}

const MESSAGE_HANDLERS: MessageHandlers = {
  "add-tasks": async ({ urls, options }) => {
    let client = await getSynologyClient();
    const showNonErrorNotifications =
      (await PersistentState.get())?.settings.notifications.enableFeedbackNotifications ?? false;
    return addDownloadTasksAndPoll(client, showNonErrorNotifications, urls, options);
  },
  "poll-tasks": async () => {
    let client = await getSynologyClient();
    return fetchTasksIntoStorage(client);
  },
  "pause-task": async ({ taskId }) => {
    let client = await getSynologyClient();
    const response = toMessageResponse(await client.DownloadStation.Task.Pause({ id: [taskId] }));
    if (response.success) {
      await fetchTasksIntoStorage(client);
    }
    return response;
  },
  "resume-task": async ({ taskId }) => {
    let client = await getSynologyClient();
    const response = toMessageResponse(await client.DownloadStation.Task.Resume({ id: [taskId] }));
    if (response.success) {
      await fetchTasksIntoStorage(client);
    }
    return response;
  },
  "delete-tasks": async ({ taskIds }) => {
    let client = await getSynologyClient();
    const response = toMessageResponse(
      await client.DownloadStation.Task.Delete({ id: taskIds, force_complete: false }),
    );
    if (response.success) {
      await fetchTasksIntoStorage(client);
    }
    return response;
  },
  "get-config": async () => {
    let client = await getSynologyClient();
    return toMessageResponse(await client.DownloadStation.Info.GetConfig(), (data) => data);
  },
  "list-directories": async ({ path }) => {
    let client = await getSynologyClient();
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
  "set-login-password": async ({ password }) => {
    // Drop any existing client on the floor.
    await SessionState.remove("auth");
    await SessionState.set({ password });
    await clearCachedTasks();
  },
};

async function handleMessage(m: Message) {
  try {
    return await MESSAGE_HANDLERS[m.type](m as any);
  } catch (error) {
    saveLastSevereError(error);
  }
}

export function initializeMessageListener() {
  browser.runtime.onMessage.addListener((m) => {
    if (Message.is(m)) {
      return handleMessage(m);
    } else {
      console.error("received unhandleable message", m);
      return undefined;
    }
  });
}

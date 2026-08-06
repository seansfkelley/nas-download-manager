import { ClientRequestResult } from "../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../common/apis/errors";
import { MessageResponse, Message, Result } from "../common/apis/messages";
import { addDownloadTasksAndPoll, pollTasks } from "./actions";
import { clearCachedTasks } from "../common/state";
import { BackgroundContext, getBackgroundContext, setSessionPassword } from "./backgroundState";
import type { DiscriminateUnion } from "../common/types";

type MessageHandler<T extends Message, U extends Result[keyof Result]> = (
  m: T,
  state: BackgroundContext,
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
    return addDownloadTasksAndPoll(state.api, state.showNonErrorNotifications, m.urls, m.options);
  },
  "poll-tasks": (_m, state) => {
    return pollTasks(state.api);
  },
  "pause-task": async (m, state) => {
    const response = toMessageResponse(
      await state.api.DownloadStation.Task.Pause({ id: [m.taskId] }),
    );
    if (response.success) {
      await pollTasks(state.api);
    }
    return response;
  },
  "resume-task": async (m, state) => {
    const response = toMessageResponse(
      await state.api.DownloadStation.Task.Resume({ id: [m.taskId] }),
    );
    if (response.success) {
      await pollTasks(state.api);
    }
    return response;
  },
  "delete-tasks": async (m, state) => {
    const response = toMessageResponse(
      await state.api.DownloadStation.Task.Delete({ id: m.taskIds, force_complete: false }),
    );
    if (response.success) {
      await pollTasks(state.api);
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
  "set-login-password": async (m, state) => {
    // Always reset the session, and do it first, while this client still holds the one the old
    // password established. Nothing after this can log out of it: clients are built per use, and
    // the stored auth is keyed on the password, so the next one starts from nothing.
    await state.api.Auth.Logout();
    // Session storage rather than the client, which does not outlive this message: with "remember
    // password" off this is the only place the password exists.
    if (await setSessionPassword(m.password)) {
      await clearCachedTasks();
    }
  },
};

async function handleMessage(m: Message) {
  return MESSAGE_HANDLERS[m.type](m as any, await getBackgroundContext());
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

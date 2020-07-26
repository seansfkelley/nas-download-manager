import { SynologyResponse, ConnectionFailure, isConnectionFailure } from "synology-typescript-api";
import { errorMessageFromCode, errorMessageFromConnectionFailure } from "../common/apis/errors";
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

function toMessageResponse(response: SynologyResponse<any> | ConnectionFailure): MessageResponse {
  if (isConnectionFailure(response)) {
    return {
      success: false,
      reason: errorMessageFromConnectionFailure(response),
    };
  } else if (!response.success) {
    return {
      success: false,
      reason: errorMessageFromCode(response.error.code, "DownloadStation.Task"),
    };
  } else {
    return {
      success: true,
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

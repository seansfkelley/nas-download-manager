import type { RequestManager } from "../requestManager";
import { SynologyClient, ClientRequestResult } from "../../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import { type TaskState, SessionState } from "../../common/state";
import { saveLastSevereError } from "../../common/errorHandlers";
import { assertNever } from "../../common/lang";

function setCachedTasks(cachedTasks: Partial<TaskState>) {
  return SessionState.set({
    tasksLastCompletedFetchTimestamp: Date.now(),
    ...cachedTasks,
  });
}

export async function fetchTasks(api: SynologyClient, manager: RequestManager): Promise<void> {
  const token = manager.startNewRequest();

  const cachedTasksInit: Partial<TaskState> = {
    tasksLastInitiatedFetchTimestamp: Date.now(),
  };

  console.log(`(${token}) fetching tasks...`);

  try {
    await SessionState.set(cachedTasksInit);

    let response;

    try {
      response = await api.DownloadStation.Task.List({
        offset: 0,
        limit: -1,
        additional: ["transfer", "detail"],
        timeout: 20000,
      });
    } catch (e) {
      saveLastSevereError(e, "error while fetching list of tasks");
      return;
    }

    if (!manager.isRequestLatest(token)) {
      console.log(`(${token}) poll result outdated; ignoring`, response);
      return;
    } else {
      console.log(`(${token}) poll result still relevant; continuing...`, response);
    }

    if (ClientRequestResult.isConnectionFailure(response)) {
      if (response.type === "missing-config") {
        if (response.which === "other") {
          await setCachedTasks({
            taskFetchFailureReason: "missing-config",
          });
        } else if (response.which === "password") {
          await setCachedTasks({
            taskFetchFailureReason: "login-required",
          });
        } else {
          assertNever(response.which);
        }
      } else {
        await setCachedTasks({
          taskFetchFailureReason: {
            failureMessage: getErrorForConnectionFailure(response),
          },
        });
      }
    } else if (response.success) {
      await setCachedTasks({
        tasks: response.data.tasks,
        taskFetchFailureReason: undefined, // This works as expected in Firefox. TODO: Test Chrome.
      });
    } else {
      await setCachedTasks({
        taskFetchFailureReason: {
          failureMessage: getErrorForFailedResponse(response),
        },
      });
    }
  } catch (e) {
    saveLastSevereError(e);
  }
}

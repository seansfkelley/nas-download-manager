import { SynologyClient, ClientRequestResult } from "../../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import { type CachedTasks, SessionState } from "../../common/state";
import { saveLastSevereError } from "../../common/errorHandlers";
import { assertNever } from "../../common/lang";

function setCachedTasks(cachedTasks: Partial<CachedTasks>) {
  return SessionState.set({
    tasksLastCompletedFetchTimestamp: Date.now(),
    ...cachedTasks,
  });
}

export async function pollTasks(api: SynologyClient): Promise<void> {
  const cachedTasksInit: Partial<CachedTasks> = {
    tasksLastInitiatedFetchTimestamp: Date.now(),
  };

  console.log("polling for tasks...");

  try {
    await SessionState.set(cachedTasksInit);

    let response;

    try {
      // Changing what this requests used to mean bumping the state version. It no longer does:
      // what comes back is session state, which install throws away wholesale.
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

    console.log("poll finished", response);

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
        taskFetchFailureReason: null,
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

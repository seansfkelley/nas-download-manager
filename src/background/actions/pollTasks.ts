import { SynologyClient, ClientRequestResult } from "../../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import { SessionState } from "../../common/state";
import { saveLastSevereError } from "../../common/errorHandlers";
import { assertNever } from "../../common/lang";

export async function pollTasks(api: SynologyClient): Promise<void> {
  console.log("polling for tasks...");

  try {
    await SessionState.set({ tasksLastInitiatedFetchTimestamp: Date.now() });

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
          await SessionState.set({
            tasksLastCompletedFetchTimestamp: Date.now(),
            taskFetchFailureReason: "missing-config",
          });
        } else if (response.which === "password") {
          await SessionState.set({
            tasksLastCompletedFetchTimestamp: Date.now(),
            taskFetchFailureReason: "login-required",
          });
        } else {
          assertNever(response.which);
        }
      } else {
        await SessionState.set({
          tasksLastCompletedFetchTimestamp: Date.now(),
          taskFetchFailureReason: {
            failureMessage: getErrorForConnectionFailure(response),
          },
        });
      }
    } else if (response.success) {
      await SessionState.set({
        tasks: response.data.tasks,
        tasksLastCompletedFetchTimestamp: Date.now(),
        // TODO: Test that this works, or if I have to call remove.
        taskFetchFailureReason: undefined,
      });
    } else {
      await SessionState.set({
        tasksLastCompletedFetchTimestamp: Date.now(),
        taskFetchFailureReason: {
          failureMessage: getErrorForFailedResponse(response),
        },
      });
    }
  } catch (e) {
    saveLastSevereError(e);
  }
}

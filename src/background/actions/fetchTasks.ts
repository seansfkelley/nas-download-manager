import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import { SynologyClient, ClientRequestResult } from "../../common/apis/synology";
import { saveLastSevereError } from "../../common/errorHandlers";
import { assertNever } from "../../common/lang";
import { type TaskState, SessionState } from "../../common/state";

function setCachedTasks(cachedTasks: Partial<TaskState>) {
  return SessionState.set({
    tasksLastCompletedFetchTimestamp: Date.now(),
    ...cachedTasks,
  });
}

export async function fetchTasks(api: SynologyClient): Promise<void> {
  const fetchId = crypto.randomUUID();

  console.log(`(${fetchId}) fetching tasks...`);

  try {
    await SessionState.set({
      tasksLastInitiatedFetchTimestamp: Date.now(),
      latestTaskFetchId: fetchId,
    });

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

    // Naive "compare and swap". We aren't doing HFT here, so this is enough to avoid confusing
    // states where a stale fetch clobbers a newer fetch that completed first.
    if ((await SessionState.get()).latestTaskFetchId !== fetchId) {
      console.log(`(${fetchId}) fetch result outdated; ignoring`, response);
      return;
    } else {
      console.log(`(${fetchId}) fetch result still relevant; continuing...`, response);
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

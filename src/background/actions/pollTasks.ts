import type { RequestManager } from "../backgroundState";
import { SynologyClient, ClientRequestResult } from "../../common/apis/synology/client";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import type { State } from "../../common/state/defaults";
import { saveLastSevereError } from "../../common/errorHandlers";
import { assertNever } from "../../common/lang";

type CachedTasks = Pick<
  State,
  | "tasks"
  | "taskFetchFailureReason"
  | "tasksLastInitiatedFetchTimestamp"
  | "tasksLastCompletedFetchTimestamp"
>;

function setCachedTasks(cachedTasks: Partial<CachedTasks>) {
  return browser.storage.local.set({
    tasksLastCompletedFetchTimestamp: Date.now(),
    ...cachedTasks,
  });
}

export function clearCachedTasks() {
  const emptyState: CachedTasks = {
    tasks: [],
    taskFetchFailureReason: null,
    tasksLastCompletedFetchTimestamp: null,
    tasksLastInitiatedFetchTimestamp: null,
  };

  return browser.storage.local.set(emptyState);
}

export async function pollTasks(api: SynologyClient, manager: RequestManager): Promise<void> {
  const token = manager.startNewRequest();

  const cachedTasksInit: Partial<CachedTasks> = {
    tasksLastInitiatedFetchTimestamp: Date.now(),
  };

  console.log(`(${token}) polling for tasks...`);

  try {
    await browser.storage.local.set(cachedTasksInit);

    let response;

    try {
      // When changing what this requests, you almost certainly want to update STATE_VERSION.
      response = await api.DownloadStation.Task.List({
        offset: 0,
        limit: -1,
        additional: ["transfer", "detail"],
        timeout: 45000,
      });
    } catch (e) {
      saveLastSevereError(e, "error while fetching list of tasks");
      return;
    }

    if (!manager.isRequestLatest(token)) {
      console.log(`(${token}) poll result outdated; ignoring`);
      return;
    } else {
      console.log(
        `(${token}) poll result: success=${!ClientRequestResult.isConnectionFailure(response) && response.success}`,
      );
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

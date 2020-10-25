import { ApiClient, isConnectionFailure } from "synology-typescript-api";
import type { RequestManager } from "../requestManager";
import { errorMessageFromCode, errorMessageFromConnectionFailure } from "../../common/apis/errors";
import type { CachedTasks, State } from "../../common/state";
import { onUnhandledError } from "../../common/errorHandlers";

function setCachedTasks(cachedTasks: Partial<CachedTasks>) {
  return browser.storage.local.set<Partial<State>>({
    tasksLastCompletedFetchTimestamp: Date.now(),
    ...cachedTasks,
  });
}

export async function pollTasks(api: ApiClient, manager: RequestManager): Promise<void> {
  const token = manager.startNewRequest();

  const cachedTasksInit: Partial<CachedTasks> = {
    tasksLastInitiatedFetchTimestamp: Date.now(),
  };

  console.log(`(${token}) polling for tasks...`);

  try {
    await browser.storage.local.set<Partial<State>>(cachedTasksInit);

    let response;

    try {
      // HELLO THERE
      //
      // When changing what this requests, you almost certainly want to update STATE_VERSION.
      response = await api.DownloadStation.Task.List({
        offset: 0,
        limit: -1,
        additional: ["transfer", "detail"],
        timeout: 20000,
      });
    } catch (e) {
      onUnhandledError(e, "error while fetching list of tasks");
      return;
    }

    if (!manager.isRequestLatest(token)) {
      console.log(`(${token}) poll result outdated; ignoring`, response);
      return;
    } else {
      console.log(`(${token}) poll result still relevant; continuing...`, response);
    }

    if (isConnectionFailure(response)) {
      if (response.type === "missing-config") {
        await setCachedTasks({
          taskFetchFailureReason: "missing-config",
        });
      } else {
        await setCachedTasks({
          taskFetchFailureReason: {
            failureMessage: errorMessageFromConnectionFailure(response),
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
          failureMessage: errorMessageFromCode(response.error.code, "DownloadStation.Task"),
        },
      });
    }
  } catch (e) {
    onUnhandledError(e);
  }
}

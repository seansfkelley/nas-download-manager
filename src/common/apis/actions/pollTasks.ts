import uniqueId from "lodash-es/uniqueId";
import { ApiClient, isConnectionFailure } from "synology-typescript-api";
import { errorMessageFromCode, errorMessageFromConnectionFailure } from "../errors";
import type { CachedTasks, State } from "../../state";
import { onUnhandledError } from "../../errorHandlers";

type WithoutPromise<T> = T extends Promise<infer U> ? U : T;

function setCachedTasks(cachedTasks: Partial<CachedTasks>) {
  return browser.storage.local.set<Partial<State>>({
    tasksLastCompletedFetchTimestamp: Date.now(),
    ...cachedTasks,
  });
}

export async function pollTasks(api: ApiClient): Promise<void> {
  const cachedTasksInit: Partial<CachedTasks> = {
    tasksLastInitiatedFetchTimestamp: Date.now(),
  };

  const pollId = uniqueId("poll-");
  console.log(`(${pollId}) polling for tasks...`);

  try {
    await browser.storage.local.set<Partial<State>>(cachedTasksInit);

    // This type declaration shouldn't be necessary, but without it this bug happens:
    // https://github.com/microsoft/TypeScript/issues/33666
    let response: WithoutPromise<ReturnType<typeof api.DownloadStation.Task.List>>;

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

    console.log(`(${pollId}) poll completed with response`, response);

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

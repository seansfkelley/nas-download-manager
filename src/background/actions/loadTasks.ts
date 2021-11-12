import { ClientRequestResult, SynologyClient } from "../../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import { saveLastSevereError } from "../../common/errorHandlers";
import type { MutableContextContainer } from "../backgroundState";
import type { Downloads } from "../../common/apis/messages";

export async function loadTasks(
  api: SynologyClient,
  updateDownloads: (downloads: Partial<Downloads>) => void,
  container: MutableContextContainer,
): Promise<void> {
  const context = container.get(loadTasks, {
    resolvers: [] as ((v: void) => void)[],
    currentRequestId: 0,
  });

  return new Promise(async (resolve) => {
    const requestId = ++context.currentRequestId;

    console.log(`${requestId} loading tasks...`);

    context.resolvers.push(resolve);

    updateDownloads({
      tasksLastInitiatedFetchTimestamp: Date.now(),
    });

    let result;
    let error;
    try {
      result = await performLoad(api);
    } catch (e) {
      error = e;
    }

    if (requestId === context.currentRequestId) {
      console.log(`(${requestId}) result/error is latest; proceeding`, result, error);
      if (result) {
        updateDownloads(result);
      } else {
        saveLastSevereError(error);
      }
      const resolvers = context.resolvers.slice();
      // Note that this is only safe because we never save a direct reference to the array anywhere.
      context.resolvers = [];
      resolvers.forEach((r) => r());
    } else {
      console.log(`(${requestId}) result/error is outdated; ignoring`, result, error);
    }
  });
}

async function performLoad(api: SynologyClient): Promise<Partial<Downloads>> {
  const response = await api.DownloadStation.Task.List({
    offset: 0,
    limit: -1,
    additional: ["transfer", "detail"],
    timeout: 20000,
  });

  if (ClientRequestResult.isConnectionFailure(response)) {
    if (response.type === "missing-config") {
      return {
        tasksLastCompletedFetchTimestamp: Date.now(),
        taskFetchFailureReason: "missing-config",
      };
    } else {
      return {
        tasksLastCompletedFetchTimestamp: Date.now(),
        taskFetchFailureReason: {
          failureMessage: getErrorForConnectionFailure(response),
        },
      };
    }
  } else if (response.success) {
    return {
      tasksLastCompletedFetchTimestamp: Date.now(),
      tasks: response.data.tasks,
      taskFetchFailureReason: undefined,
    };
  } else {
    return {
      tasksLastCompletedFetchTimestamp: Date.now(),
      taskFetchFailureReason: {
        failureMessage: getErrorForFailedResponse(response),
      },
    };
  }
}

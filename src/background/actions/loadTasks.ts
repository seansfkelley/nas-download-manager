import { ClientRequestResult, SynologyClient } from "../../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import { saveLastSevereError } from "../../common/errorHandlers";
import type { Downloads } from "../../common/apis/messages";
import { getStateSingleton } from "../backgroundState";

let resolvers: ((v: void) => void)[] = [];
let currentRequestId = 0;

export async function loadTasks(): Promise<void> {
  const { api, updateDownloads } = getStateSingleton();

  return new Promise(async (resolve) => {
    const requestId = ++currentRequestId;

    console.log(`${requestId} loading tasks...`);

    resolvers.push(resolve);

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

    if (requestId === currentRequestId) {
      console.log(`(${requestId}) result/error is latest; proceeding`, result, error);
      if (result) {
        updateDownloads(result);
      } else {
        saveLastSevereError(error);
      }

      // TODO: This is probably unnecessary, but in theory if the Promise constructor invokes the
      // callback synchronously _and_ these resolvers are synchronous (probably not?) _and_ one of
      // these resolvers calls loadTasks, we could end up resolving a promise too soon. I have to
      // find docs which can clarify how sync/which tick of the event loops some of things happen in.
      const stashedResolvers = resolvers;
      resolvers = [];
      stashedResolvers.forEach((r) => r());
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

import { ClientRequestResult } from "../../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import { saveLastSevereError } from "../../common/errorHandlers";
import { CommonBackgroundState, updateStateSingleton } from "../backgroundState";

let lastRequestId = 0;

export async function loadTasks(state: CommonBackgroundState): Promise<void> {
  const currentRequestId = ++lastRequestId;

  updateStateSingleton({
    downloads: {
      ...state.downloads,
      tasksLastInitiatedFetchTimestamp: Date.now(),
    },
  });

  console.log(`(${currentRequestId}) loading tasks...`);

  try {
    let response;

    try {
      response = await state.api.DownloadStation.Task.List({
        offset: 0,
        limit: -1,
        additional: ["transfer", "detail"],
        timeout: 20000,
      });
    } catch (e) {
      saveLastSevereError(e, "error while fetching list of tasks");
      return;
    }

    if (currentRequestId !== lastRequestId) {
      console.log(`(${currentRequestId}) result outdated; ignoring`, response);
      return;
    } else {
      console.log(`(${currentRequestId}) result still relevant; continuing...`, response);
    }

    if (ClientRequestResult.isConnectionFailure(response)) {
      if (response.type === "missing-config") {
        updateStateSingleton({
          downloads: {
            ...state.downloads,
            tasksLastCompletedFetchTimestamp: Date.now(),
            taskFetchFailureReason: "missing-config",
          },
        });
      } else {
        updateStateSingleton({
          downloads: {
            ...state.downloads,
            tasksLastCompletedFetchTimestamp: Date.now(),
            taskFetchFailureReason: {
              failureMessage: getErrorForConnectionFailure(response),
            },
          },
        });
      }
    } else if (response.success) {
      updateStateSingleton({
        downloads: {
          ...state.downloads,
          tasksLastCompletedFetchTimestamp: Date.now(),
          tasks: response.data.tasks,
          taskFetchFailureReason: undefined,
        },
      });
    } else {
      updateStateSingleton({
        downloads: {
          ...state.downloads,
          tasksLastCompletedFetchTimestamp: Date.now(),
          taskFetchFailureReason: {
            failureMessage: getErrorForFailedResponse(response),
          },
        },
      });
    }
  } catch (e) {
    saveLastSevereError(e);
  }
}

import { ClientRequestResult, SynologyClient } from "../../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import { saveLastSevereError } from "../../common/errorHandlers";
import type { Downloads } from "../backgroundState";

let lastRequestId = 0;

export async function loadTasks(
  api: SynologyClient,
  updateDownloads: (downloads: Partial<Downloads>) => void,
): Promise<void> {
  const currentRequestId = ++lastRequestId;

  updateDownloads({
    tasksLastInitiatedFetchTimestamp: Date.now(),
  });

  console.log(`(${currentRequestId}) loading tasks...`);

  try {
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

    if (currentRequestId !== lastRequestId) {
      console.log(`(${currentRequestId}) result outdated; ignoring`, response);
      return;
    } else {
      console.log(`(${currentRequestId}) result still relevant; continuing...`, response);
    }

    if (ClientRequestResult.isConnectionFailure(response)) {
      if (response.type === "missing-config") {
        updateDownloads({
          tasksLastCompletedFetchTimestamp: Date.now(),
          taskFetchFailureReason: "missing-config",
        });
      } else {
        updateDownloads({
          tasksLastCompletedFetchTimestamp: Date.now(),
          taskFetchFailureReason: {
            failureMessage: getErrorForConnectionFailure(response),
          },
        });
      }
    } else if (response.success) {
      updateDownloads({
        tasksLastCompletedFetchTimestamp: Date.now(),
        tasks: response.data.tasks,
        taskFetchFailureReason: undefined,
      });
    } else {
      updateDownloads({
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

import { ClientRequestResult } from "../../common/apis/synology";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import { saveLastSevereError } from "../../common/errorHandlers";
import type { BackgroundState } from "../backgroundState";
import { update as updateTasks } from "../updates/tasks";

export async function loadTasks(state: BackgroundState): Promise<void> {
  function setTasks(stateUpdates: Partial<BackgroundState>) {
    Object.assign(state, stateUpdates, { tasksLastCompletedFetchTimestamp: Date.now() });
    updateTasks(state);
  }

  const token = state.taskLoadRequestManager.startNewRequest();

  state.tasksLastInitiatedFetchTimestamp = Date.now();

  console.log(`(${token}) loading tasks...`);

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

    if (!state.taskLoadRequestManager.isRequestLatest(token)) {
      console.log(`(${token}) poll result outdated; ignoring`, response);
      return;
    } else {
      console.log(`(${token}) poll result still relevant; continuing...`, response);
    }

    if (ClientRequestResult.isConnectionFailure(response)) {
      if (response.type === "missing-config") {
        setTasks({
          taskFetchFailureReason: "missing-config",
        });
      } else {
        setTasks({
          taskFetchFailureReason: {
            failureMessage: getErrorForConnectionFailure(response),
          },
        });
      }
    } else if (response.success) {
      setTasks({
        tasks: response.data.tasks,
        taskFetchFailureReason: undefined,
      });
    } else {
      setTasks({
        taskFetchFailureReason: {
          failureMessage: getErrorForFailedResponse(response),
        },
      });
    }
  } catch (e) {
    saveLastSevereError(e);
  }
}

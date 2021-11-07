import type { BackgroundState } from "../backgroundState";

export function clearTasks(state: BackgroundState) {
  state.tasks = [];
  state.taskFetchFailureReason = undefined;
  state.tasksLastCompletedFetchTimestamp = undefined;
  state.tasksLastInitiatedFetchTimestamp = undefined;
}

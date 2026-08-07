import { SessionState, TaskState } from "../../common/state";

export function clearCachedTasks() {
  return SessionState.set({
    tasks: undefined,
    taskFetchFailureReason: undefined,
    tasksLastCompletedFetchTimestamp: undefined,
    tasksLastInitiatedFetchTimestamp: undefined,
  } satisfies Record<keyof TaskState, undefined>);
}

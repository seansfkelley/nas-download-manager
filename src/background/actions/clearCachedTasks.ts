import { typesafeUnionMembers } from "../../common/lang";
import { SessionState, TaskState } from "../../common/state";

const keys = typesafeUnionMembers<keyof TaskState>({
  tasks: true,
  taskFetchFailureReason: true,
  tasksLastCompletedFetchTimestamp: true,
  tasksLastInitiatedFetchTimestamp: true,
});

export function clearCachedTasks() {
  return SessionState.remove(...keys);
}

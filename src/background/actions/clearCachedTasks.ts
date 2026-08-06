import { CACHED_TASK_NAMES, SessionState } from "../../common/state";

export function clearCachedTasks() {
  return SessionState.remove(...CACHED_TASK_NAMES);
}

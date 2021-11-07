import { getMutableStateSingleton } from "./backgroundState";
import type { State } from "../common/state";

import { update as updateApi } from "./updates/api";
import { update as updateNotifications } from "./updates/notifications";
import { update as updateTasks } from "./updates/tasks";

export function onStoredStateChange(storedState: State) {
  const state = getMutableStateSingleton();

  state.lastSettings = state.settings;
  state.settings = storedState.settings;

  updateApi(state);
  updateNotifications(state);
  updateTasks(state);
}

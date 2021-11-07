import { CommonBackgroundState, updateStateSingleton } from "../backgroundState";
import { SessionName } from "../../common/apis/synology";
import { getHostUrl } from "../../common/state";
import { loadTasks } from "../actions";

let didInitializeSettings = false;

export function onChange(state: CommonBackgroundState) {
  const didUpdateSettings = state.api.updateSettings({
    baseUrl: getHostUrl(state.settings.connection),
    account: state.settings.connection.username,
    passwd: state.settings.connection.password,
    session: SessionName.DownloadStation,
  });

  if (didUpdateSettings) {
    // TODO: Figure out how to prevent a listener loop here. This is the only place where it
    // can happen, I'm pretty sure. I'd like to throw an error if one occurs , but I'm not
    // sure how to change this to avoid getting into that state.
    updateStateSingleton({
      downloads: {
        tasks: [],
        taskFetchFailureReason: undefined,
        tasksLastCompletedFetchTimestamp: undefined,
        tasksLastInitiatedFetchTimestamp: undefined,
      },
    });

    if (didInitializeSettings) {
      // Don't await this -- just let it run in the background.
      loadTasks(state);
    }

    // This is a little bit of a hack, but basically: onStoredStateChange eagerly fires this
    // listener when it initializes. That first time through, the client gets initialized for
    // the first time, and so we necessarily clear and reload. However, if the user hasn't
    // configured notifications, we should try to avoid pinging the NAS, since we know we're
    // opening in the background. Hence this boolean. If notifications are enabled, those'll
    // still get set up and we'll starting pinging in the background.
    didInitializeSettings = true;
  }
}

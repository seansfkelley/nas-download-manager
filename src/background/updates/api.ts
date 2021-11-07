import type { BackgroundState } from "../backgroundState";
import { SessionName } from "../../common/apis/synology";
import { getHostUrl } from "../../common/state";
import { loadTasks, clearTasks } from "../actions";

export function update(state: BackgroundState) {
  const didUpdateSettings = state.api.updateSettings({
    baseUrl: getHostUrl(state.settings.connection),
    account: state.settings.connection.username,
    passwd: state.settings.connection.password,
    session: SessionName.DownloadStation,
  });

  if (didUpdateSettings) {
    clearTasks(state);

    if (state.didInitializeSettings) {
      // Don't await this -- just let it run in the background.
      loadTasks(state);
    }

    // This is a little bit of a hack, but basically: onStoredStateChange eagerly fires this
    // listener when it initializes. That first time through, the client gets initialized for
    // the first time, and so we necessarily clear and reload. However, if the user hasn't
    // configured notifications, we should try to avoid pinging the NAS, since we know we're
    // opening in the background. Hence this boolean. If notifications are enabled, those'll
    // still get set up and we'll starting pinging in the background.
    state.didInitializeSettings = true;
  }
}

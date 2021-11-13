import { SessionName } from "../../common/apis/synology";
import { getHostUrl } from "../../common/state";
import { loadTasks } from "../actions";
import { getStateSingleton } from "../backgroundState";
import type { Listener } from "./registry";

let didInitializeSettings = false;

export const updateApiAndReloadTasks = (() => {
  const { api, settings, updateDownloads } = getStateSingleton();

  const didUpdateSettings = api.updateSettings({
    baseUrl: getHostUrl(settings.connection),
    account: settings.connection.username,
    passwd: settings.connection.password,
    session: SessionName.DownloadStation,
  });

  if (didUpdateSettings) {
    updateDownloads({
      tasks: [],
      taskFetchFailureReason: undefined,
      tasksLastCompletedFetchTimestamp: undefined,
      tasksLastInitiatedFetchTimestamp: undefined,
    });

    if (didInitializeSettings) {
      // Don't await this -- just let it run in the background.
      loadTasks();
    }

    // This is a little bit of a hack, but basically: onStoredStateChange eagerly fires this
    // listener when it initializes. That first time through, the client gets initialized for
    // the first time, and so we necessarily clear and reload. However, if the user hasn't
    // configured notifications, we should try to avoid pinging the NAS, since we know we're
    // opening in the background. Hence this boolean. If notifications are enabled, those'll
    // still get set up and we'll starting pinging in the background.
    didInitializeSettings = true;
  }
}) as Listener;

updateApiAndReloadTasks.listenTo = ["settings"];

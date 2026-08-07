import { SessionName } from "../../common/apis/synology";
import { getHostUrl, Settings } from "../../common/state";
import { clearCachedTasks, fetchTasks } from "../actions";
import { getMutableStateSingleton } from "../backgroundState";

let isInitializingExtension = true;

export async function updateCredentials(settings: Settings) {
  const backgroundState = getMutableStateSingleton();

  let didUpdateSettings = backgroundState.api.partiallyUpdateSettings({
    baseUrl: getHostUrl(settings.connection),
    account: settings.connection.username,
    session: SessionName.DownloadStation,
    // Do NOT set password from here. It might not be set because of the "remember me" feature, so
    // we could erroneously overwrite it. Instead, read it once at startup time (if configured), and
    // otherwise, wait for an imperative login request message to be handled elsewhere.
  });

  if (isInitializingExtension && settings.connection.rememberPassword) {
    // Note the ordering here: avoid short-circuiting.
    didUpdateSettings =
      backgroundState.api.partiallyUpdateSettings({
        passwd: settings.connection.password,
      }) || didUpdateSettings;
  }

  if (didUpdateSettings) {
    const clearCachePromise = clearCachedTasks();

    // This is a little bit of a hack, but basically: onStoredStateChange eagerly fires this
    // listener when it initializes. That first time through, the client gets initialized for the
    // first time, and so we necessarily clear and reload. However, if the user hasn't configured
    // notifications, we should try to avoid pinging the NAS, since we know we're opening in the
    // background. If notifications are enabled, those'll still get set up and we'll starting
    // pinging in the background.
    if (!isInitializingExtension) {
      // Don't use await because we want this to fire in the background.
      clearCachePromise.then(() => {
        fetchTasks(backgroundState.api);
      });
    }
  }

  isInitializingExtension = false;
}

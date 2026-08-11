import { ConnectionFailure, SynologyClientSettings } from "../../common/apis/synology";
import { SessionState } from "../../common/state";
import { clearCachedTasks, fetchTasks } from "../actions";
import { getClientSettings } from "../client";

// Cached tasks belong to whichever NAS and account fetched them, so a connection change invalidates
// them. The stored auth records the settings it was issued under, which is what we compare against;
// no auth means nothing has successfully talked to a NAS yet, so there is nothing stale to clear.
export async function refetchOnConnectionChange() {
  const { auth } = await SessionState.get();
  if (auth == null) {
    return;
  }

  const settings = await getClientSettings();
  if (ConnectionFailure.is(settings) || !SynologyClientSettings.isEqual(auth.settings, settings)) {
    await clearCachedTasks();
    // Don't await: this should fire in the background.
    fetchTasks();
  }
}

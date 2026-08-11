import {
  ConnectionFailure,
  SynologyClient,
  SynologyClientSettings,
} from "../../common/apis/synology";
import { SessionState } from "../../common/state";
import { clearCachedTasks, fetchTasks } from "../actions";

export async function refetchTasksOnConnectionChange(client: SynologyClient) {
  const { auth } = await SessionState.get();
  if (auth == null) {
    return;
  }

  const settings = await client.getSettings();
  if (ConnectionFailure.is(settings) || !SynologyClientSettings.isEqual(auth.settings, settings)) {
    await clearCachedTasks();
    await fetchTasks(client);
  }
}

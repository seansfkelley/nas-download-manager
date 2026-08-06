import { SynologyClient, SessionName, SynologySessionKey } from "../common/apis/synology";
import { saveLastSevereError } from "../common/errorHandlers";
import { getHostUrl, PersistentState, SessionState } from "../common/state";
import { isEqual } from "lodash";

export async function getSynologyClient(): Promise<SynologyClient> {
  const [state, session] = await Promise.all([PersistentState.get(), SessionState.get()]);
  if (state == null) {
    return new SynologyClient({}, undefined, undefined);
  }
  const {
    settings: { connection },
  } = state;

  const password = connection.password ?? session.password;
  if (password == null) {
    return new SynologyClient({}, undefined, undefined);
  }

  let baseUrl = getHostUrl(connection);
  if (baseUrl == null) {
    return new SynologyClient({}, undefined, undefined);
  }

  const sessionKey: SynologySessionKey = {
    baseUrl,
    account: connection.username,
    session: SessionName.DownloadStation,
  };

  return new SynologyClient(
    { ...sessionKey, passwd: password },
    session.auth != null && isEqual(session.auth.key, sessionKey) ? session.auth.result : undefined,
    async (result) => {
      try {
        if (result == null) {
          await SessionState.remove("auth");
        } else {
          await SessionState.set({ auth: { key: sessionKey, result } });
        }
      } catch (error) {
        saveLastSevereError(error);
      }
    },
  );
}

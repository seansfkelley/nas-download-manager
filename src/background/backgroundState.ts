import {
  type AuthResult,
  ClientRequestResult,
  SynologyClient,
  SessionName,
} from "../common/apis/synology";
import type { ConnectionSettings } from "../common/state";
import { getHostUrl, PersistentState, SessionState } from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";

// Every credential the NAS checks, so that changing any of them invalidates the auth result. The
// password is in here too, which is why this cannot be the same key the cached tasks use.
function authKey(connection: ConnectionSettings, password: string | undefined) {
  return JSON.stringify([getHostUrl(connection), connection.username, password]);
}

// storage.session cannot hold the Error or Response that a ConnectionFailure carries around. Only
// the type is ever read -- getErrorForConnectionFailure switches on it alone -- so the payload is
// dropped rather than worked around.
function storable(result: AuthResult): AuthResult {
  return ClientRequestResult.isConnectionFailure(result) ? { ...result, error: undefined } : result;
}

export interface BackgroundContext {
  api: SynologyClient;
  showNonErrorNotifications: boolean;
}

// Everything a handler used to read off the mutable singleton, rebuilt from storage each time.
export async function getBackgroundContext(): Promise<BackgroundContext> {
  const [{ settings }, session] = await Promise.all([PersistentState.get(), SessionState.get()]);
  const { connection } = settings;
  const password = connection.rememberPassword ? connection.password : session.password;
  const key = authKey(connection, password);

  const api = new SynologyClient(
    {
      baseUrl: getHostUrl(connection),
      account: connection.username,
      passwd: password,
      session: SessionName.DownloadStation,
    },
    session.auth?.connection === key ? session.auth.result : undefined,
    // Written as it changes rather than collected at the end of the request: there is no end to
    // hook, because the context that made the request may not be alive to see it finish.
    (result) => {
      const write =
        result == null
          ? SessionState.remove("auth")
          : SessionState.set({ auth: { connection: key, result: storable(result) } });
      write.catch(saveLastSevereError);
    },
  );

  return {
    api,
    showNonErrorNotifications: settings.notifications.enableFeedbackNotifications,
  };
}

// Returns whether this actually changes the password the next client will be built with, mirroring
// the choice getBackgroundContext makes. With "remember password" on, the settings page has already
// written it to storage.local by the time this runs, so the answer is usually no.
export async function setSessionPassword(password: string) {
  const [{ settings }, session] = await Promise.all([PersistentState.get(), SessionState.get()]);
  const previous = settings.connection.rememberPassword
    ? settings.connection.password
    : session.password;
  await SessionState.set({ password });
  return previous !== password;
}

export async function getFinishedTaskIds() {
  return (await SessionState.get()).finishedTaskIds;
}

export async function setFinishedTaskIds(finishedTaskIds: string[]) {
  await SessionState.set({ finishedTaskIds });
}

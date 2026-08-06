import {
  type AuthResult,
  ClientRequestResult,
  SynologyClient,
  SessionName,
} from "../common/apis/synology";
import type { ConnectionSettings } from "../common/state";
import { getHostUrl, State } from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";

// storage.session rather than module scope, because a background context that can be suspended
// loses module scope without warning. Its lifetime -- cleared on browser restart, never written to
// disk -- is exactly what "remember for this session" means.
interface SessionState {
  // Keyed on the connection it was obtained with, so that changing any of the credentials discards
  // it without anyone having to remember to. Reusing a session against a different DiskStation, or
  // reusing "incorrect password" against a password the user has since fixed, are both wrong, and
  // both are unreachable if the key has to match.
  auth?: { connection: string; result: AuthResult };
  // Only set when "remember password" is off, where the password deliberately never reaches
  // storage.local and would otherwise be lost along with module scope.
  password?: string;
  // An array because Set does not serialize. Absent means no poll has completed yet, which is what
  // keeps the first poll from notifying about everything that finished before we were watching.
  finishedTaskIds?: string[];
  // What the cached tasks were fetched with, so a change of DiskStation can invalidate them.
  cachedTasksConnection?: string;
}

function getSessionState(): Promise<SessionState> {
  return browser.storage.session.get(null) as Promise<SessionState>;
}

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
  const [{ settings }, session] = await Promise.all([State.get(), getSessionState()]);
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
          ? browser.storage.session.remove("auth")
          : browser.storage.session.set({ auth: { connection: key, result: storable(result) } });
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
  const [{ settings }, session] = await Promise.all([State.get(), getSessionState()]);
  const previous = settings.connection.rememberPassword
    ? settings.connection.password
    : session.password;
  await browser.storage.session.set({ password });
  return previous !== password;
}

export async function getFinishedTaskIds() {
  const { finishedTaskIds } = await getSessionState();
  return finishedTaskIds == null ? undefined : new Set(finishedTaskIds);
}

export async function setFinishedTaskIds(finishedTaskIds: string[]) {
  await browser.storage.session.set({ finishedTaskIds });
}

export async function getCachedTasksConnection() {
  return (await getSessionState()).cachedTasksConnection;
}

export async function setCachedTasksConnection(cachedTasksConnection: string) {
  await browser.storage.session.set({ cachedTasksConnection });
}

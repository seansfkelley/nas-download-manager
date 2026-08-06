import { SynologyClient, SessionName } from "../common/apis/synology";
import { getHostUrl, State } from "../common/state";

// storage.session rather than module scope, because a background context that can be suspended
// loses module scope without warning. Its lifetime -- cleared on browser restart, never written to
// disk -- is exactly what "remember for this session" means.
interface SessionState {
  sid?: string;
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

export interface BackgroundContext {
  api: SynologyClient;
  showNonErrorNotifications: boolean;
}

// Everything a handler used to read off the mutable singleton, rebuilt from storage each time. The
// client is handed back afterwards so its session outlives this context; forgetting to do that
// costs a login round trip on every single request, which is why it is a wrapper and not a getter.
export async function withBackgroundContext<T>(
  fn: (context: BackgroundContext) => T | Promise<T>,
): Promise<T> {
  const [{ settings }, session] = await Promise.all([State.get(), getSessionState()]);
  const { connection } = settings;

  const api = new SynologyClient(
    {
      baseUrl: getHostUrl(connection),
      account: connection.username,
      passwd: connection.rememberPassword ? connection.password : session.password,
      session: SessionName.DownloadStation,
    },
    session.sid,
  );

  try {
    return await fn({
      api,
      showNonErrorNotifications: settings.notifications.enableFeedbackNotifications,
    });
  } finally {
    const sid = await api.getSid();
    if (sid == null) {
      await browser.storage.session.remove("sid");
    } else {
      await browser.storage.session.set({ sid });
    }
  }
}

export async function setSessionPassword(password: string) {
  await browser.storage.session.set({ password });
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

import { SynologyClient, SessionName, SynologyClientSettings } from "../common/apis/synology";
import { saveLastSevereError } from "../common/errorHandlers";
import { getHostUrl, PersistentState, SessionState } from "../common/state";
import isEqual from "lodash/isEqual";

export interface SynologyToken {
  sid: string;
}

export async function issueDiskStationRequest<T>(
  fn: (token: SynologyToken) => Promise<T>,
): Promise<T> {
  const [persistentState, sessionState] = await Promise.all([
    PersistentState.get(),
    SessionState.get(),
  ]);

  // TODO: Clean this up.
  if (persistentState == null) {
    throw new Error("did not migrate yet");
  }

  const {
    settings: { connection },
  } = persistentState;
}

function getLoginCreds() {}

export async function loginToDiskStation(state: SessionState): Promise<SynologyToken> {}

export async function getSynologyClient(): Promise<SynologyClient> {
  const [state, session] = await Promise.all([PersistentState.get(), SessionState.get()]);
  if (state == null) {
    return new SynologyClient({}, undefined, undefined);
  }
  const {
    settings: { connection },
  } = state;

  let baseUrl = getHostUrl(connection);
  if (baseUrl == null) {
    return new SynologyClient(
      // Make sure it reports the best error possible given what we have.
      { account: connection.username, session: SessionName.DownloadStation },
      undefined,
      undefined,
    );
  }

  const password = connection.password ?? session.password;
  if (password == null) {
    return new SynologyClient(
      // Make sure it reports the best error possible given what we have.
      { baseUrl, account: connection.username, session: SessionName.DownloadStation },
      undefined,
      undefined,
    );
  }

  const settings: SynologyClientSettings = {
    baseUrl,
    account: connection.username,
    passwd: password,
    session: SessionName.DownloadStation,
  };

  return new SynologyClient(
    settings,
    session.auth != null && isEqual(session.auth.key, settings) ? session.auth.result : undefined,
    async (result) => {
      try {
        if (result == null) {
          await SessionState.remove("auth");
        } else {
          await SessionState.set({ auth: { key: settings, result } });
        }
      } catch (error) {
        saveLastSevereError(error);
      }
    },
  );
}

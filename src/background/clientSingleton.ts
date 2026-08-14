import {
  ConnectionFailure,
  SynologyClient,
  SynologyLoginParameters,
  SynologyLoginResult,
} from "../common/apis/synology";
import { saveLastSevereError } from "../common/errorHandlers";
import { PersistentState, SessionState } from "../common/state";

async function getLogin(): Promise<SynologyLoginParameters | ConnectionFailure> {
  const [persistentState, sessionState] = await Promise.all([
    PersistentState.get(),
    SessionState.get(),
  ]);
  const connection = persistentState?.settings.connection;
  // No one-time password: it only ever reaches the ephemeral client the settings page logs in
  // with. The background gets past two-step verification on the device token that login saved.
  return SynologyLoginParameters.fromConnection(
    connection,
    // Both are stored in session state iff remember password is not set, so prefer them.
    sessionState.password ?? connection?.password,
    sessionState.deviceToken ?? connection?.deviceToken,
  );
}

async function getStoredAuth(
  login: SynologyLoginParameters,
): Promise<SynologyLoginResult | undefined> {
  const stored = (await SessionState.get()).auth;
  return stored != null && SynologyLoginParameters.isEquivalent(stored.login, login)
    ? stored.auth
    : undefined;
}

// Since we construct the client as a singleton, we defer the read/write lifecycle of this to it
// completely since we don't need to reconcile multiple readers and writers.
async function onAuthChange(login: SynologyLoginParameters, auth: SynologyLoginResult | undefined) {
  try {
    if (auth == null) {
      await SessionState.set({ auth: undefined });
    } else {
      await SessionState.set({ auth: { login, auth } });
    }
  } catch (e) {
    saveLastSevereError(e, "error while persisting auth to session state");
  }
}

// Safe to construct at module scope: it does no I/O until a request is made, and it holds no state
// that outliving a single worker wakeup would corrupt. Its one mutable field dedupes in-flight
// logins, which can only race within a single wake anyway -- a promise cannot outlive its realm.
//
// One per realm is also the point: two clients on a cold wake would both miss the stored auth and
// race into a login, which the NAS reports as a session interrupted by duplicate login.
export const singleton = new SynologyClient(getLogin, getStoredAuth, onAuthChange);

import { ConnectionSettings } from "../state";

import {
  ClientRequestResult,
  ConnectionFailure,
  SynologyAuth,
  SynologyClient,
  SynologyClientSettings,
} from "./synology";

function createEphemeralClient(settings: SynologyClientSettings | ConnectionFailure) {
  let auth: SynologyAuth | undefined;
  return new SynologyClient(
    async () => settings,
    async () => auth,
    async (_settings, newAuth) => {
      auth = newAuth;
    },
  );
}

export async function testConnection(
  settings: ConnectionSettings,
): Promise<ClientRequestResult<{}>> {
  const client = createEphemeralClient(SynologyClientSettings.fromConnection(settings));
  const loginResult = await client.Auth.Login({ timeout: 30000 });

  if (!ClientRequestResult.isConnectionFailure(loginResult) && loginResult.success) {
    // Note that this is fire-and-forget.
    client.Auth.Logout({ timeout: 10000 }).then((logoutResponse) => {
      if (
        logoutResponse === "not-logged-in" ||
        ClientRequestResult.isConnectionFailure(logoutResponse) ||
        !logoutResponse.success
      ) {
        console.error(
          "ignoring unexpected failure while logging out after successful connection test",
          logoutResponse,
        );
      }
    });
  }

  return loginResult;
}

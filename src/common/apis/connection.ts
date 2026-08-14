import { ConnectionIdentifiers } from "../state";

import {
  type AuthLoginResponse,
  ClientRequestResult,
  ConnectionFailure,
  SynologyClient,
  SynologyLoginParameters,
  SynologyLoginResult,
} from "./synology";

function createEphemeralClient(login: SynologyLoginParameters | ConnectionFailure) {
  let auth: SynologyLoginResult | undefined;
  return new SynologyClient(
    async () => login,
    async () => auth,
    async (_login, newAuth) => {
      auth = newAuth;
    },
  );
}

export async function testConnection(
  identifiers: ConnectionIdentifiers,
  password: string,
  otpCode: string | undefined,
): Promise<ClientRequestResult<AuthLoginResponse>> {
  const client = createEphemeralClient(
    SynologyLoginParameters.fromConnection(
      identifiers,
      { password, deviceToken: undefined },
      otpCode,
    ),
  );
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

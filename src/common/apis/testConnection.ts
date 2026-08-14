import { ConnectionIdentifiers } from "../state";

import {
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
): Promise<ClientRequestResult<{ did: string | undefined }>> {
  const client = createEphemeralClient(
    SynologyLoginParameters.fromConnection(identifiers, password, { otpCode }),
  );
  const loginResult = await client.Auth.Login({ timeout: 30000 });

  if (!ClientRequestResult.isConnectionFailure(loginResult) && loginResult.success) {
    // Fire and forget the cleanup, just to avoid stale sessions lying around on the NAS.
    client.Auth.Logout({ timeout: 10000 });
    return {
      ...loginResult,
      data: {
        // Don't let anyone downstream use the SID that we just logged out. But the DID is useful
        // and will be valid in future login attempts.
        did: loginResult.data.did,
      },
    };
  } else {
    return loginResult;
  }
}

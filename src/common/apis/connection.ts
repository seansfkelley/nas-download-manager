import { type ConnectionSettings, getHostUrl } from "../state/defaults";
import { ClientRequestResult, SynologyClient } from "./synology/client";
import { SessionName } from "./synology/shared";

export async function testConnection(
  settings: ConnectionSettings,
): Promise<ClientRequestResult<{}>> {
  const api = new SynologyClient({
    baseUrl: getHostUrl(settings),
    account: settings.username,
    passwd: settings.password,
    session: SessionName.DownloadStation,
  });

  const loginResult = await api.Auth.Login({ timeout: 30000 });
  if (!ClientRequestResult.isConnectionFailure(loginResult) && loginResult.success) {
    // Note that this is fire-and-forget.
    api.Auth.Logout({ timeout: 10000 }).then((logoutResponse) => {
      if (logoutResponse === "not-logged-in") {
        // Typescript demands we handle this case, which is correct, but also, it's pretty wat
        console.error(`wtf: not logged in immediately after successfully logging in`);
      } else if (
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

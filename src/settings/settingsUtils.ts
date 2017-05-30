import { SessionName, ApiClient, ConnectionFailure, isConnectionFailure } from 'synology-typescript-api';
import { Settings, getHostUrl } from '../state';

export function saveSettings(settings: Settings): Promise<boolean> {
  console.log('persisting settings...');

  return testConnection(settings)
    .then(result => {
      if (result !== 'good') {
        return false;
      } else {
        return browser.storage.local.set(settings)
          .then(() => {
            console.log('done persisting settings');
            return true;
          });
      }
    })
    .catch(error => {
      console.log('unexpected failure while persisting settings', error);
      return false;
    });
}

export type ConnectionTestResult = ConnectionFailure | { code: number } | 'good';

export function isErrorCodeResult(result: ConnectionTestResult): result is { code: number } {
  return (result as { code: number }).code != null;
}

export function testConnection(settings: Settings): Promise<ConnectionTestResult> {
  const api = new ApiClient({
    baseUrl: getHostUrl(settings.connection),
    account: settings.connection.username,
    passwd: settings.connection.password,
    session: SessionName.DownloadStation
  });

  return api.Auth.Login({ timeout: 30000 })
    .then(response => {
      if (isConnectionFailure(response)) {
        return response;
      } else if (!response.success) {
        return { code: response.error.code };
      } else {
        api.Auth.Logout({ timeout: 10000 })
          .then(response => {
            if (response === 'not-logged-in') {
              // Typescript demands we handle this case, which is correct, but also, it's pretty wat
              console.error(`wtf: not logged in immediately after successfully logging in`);
            } else if (isConnectionFailure(response) || !response.success) {
              console.error('ignoring unexpected failure while logging out after successful connection test', response);
            }
          });
        return 'good';
      }
    });
}

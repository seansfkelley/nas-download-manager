import { Auth, SessionName, errorMessageFromCode } from '../api';
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

export type ConnectionTestResult = 'good' | 'bad-request' | 'timeout' | 'network-error' | 'unknown-error' | 'missing-config' | { failMessage: string };

export function testConnection(settings: Settings): Promise<ConnectionTestResult> {
  function failureMessage(failMessage?: string) {
    if (failMessage) {
      return { failMessage };
    } else {
      return 'unknown-error';
    }
  }

  const hostUrl = getHostUrl(settings.connection);
  if (!hostUrl) {
    return Promise.resolve('missing-config' as 'missing-config');
  } else {
    return Auth.Login(hostUrl, {
      account: settings.connection.username,
      passwd: settings.connection.password,
      session: SessionName.DownloadStation,
      timeout: 10000
    })
      .then(result => {
        if (!result) {
          return 'unknown-error';
        } else if (!result.success) {
          return failureMessage(errorMessageFromCode(result.error.code, Auth.API_NAME, null));
        } else {
          Auth.Logout(hostUrl, result.data.sid, {
            session: SessionName.DownloadStation
          })
            .then(response => {
              if (!response.success) {
                console.error(`ignoring unexpected unsuccessful response while logging out after a successful login test, code ${response.error.code}`);
              }
            })
            .catch(error => {
              console.error('ignoring error encountered while logging out after a successful login test', error);
            });
          return 'good';
        }
      })
      .catch((error?: any) => {
        if (error && error.response && error.response.status === 400) {
          return 'bad-request';
        } else if (error && error.message === 'Network Error') {
          return 'network-error';
        } else if (error && error.message === 'timeout of 10000ms exceeded') {
          return 'timeout';
        } else {
          console.log('unexpected error while performing login check', error);
          return 'unknown-error';
        }
      });
  }
}

export function assertNever(n: never): never {
  throw new Error(`never assertion failed, got value ${n}`);
}

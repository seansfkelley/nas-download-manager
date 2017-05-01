import { Auth, SessionName, ERROR_CODES } from '../api';
import { SESSION_ID_KEY, Settings, getHostUrl } from '../common';

export function saveSettings(settings: Settings) {
  console.log('persisting settings...');

  return Auth.Login(getHostUrl(settings.connection), {
    account: settings.connection.username,
    passwd: settings.connection.password,
    session: SessionName.DownloadStation
  })
    .then(result => {
      if (result.success) {
        return browser.storage.local.set({
          ...settings,
          [SESSION_ID_KEY]: result.data.sid
        });
      } else {
        throw new Error(ERROR_CODES.common[result.error.code] || ERROR_CODES.auth[result.error.code]);
      }
    })
    .then(() => {
      console.log('done persisting settings');
    });
}

export type ConnectionTestResult = 'good' | 'bad-request' | 'network-error' | 'unknown-error' | { failMessage: string };

export function testConnection(settings: Settings): Promise<ConnectionTestResult> {
  function failureMessage(failMessage?: string) {
    if (failMessage) {
      return { failMessage };
    } else {
      return 'unknown-error';
    }
  }

  const host = getHostUrl(settings.connection);
  return Auth.Login(host, {
    account: settings.connection.username,
    passwd: settings.connection.password,
    session: SessionName.DownloadStation
  })
    .then(result => {
      if (!result) {
        return 'unknown-error';
      } else if (!result.success) {
        return failureMessage(ERROR_CODES.common[result.error.code] || ERROR_CODES.auth[result.error.code]);
      } else {
        return 'good';
      }
    })
    .catch((error?: any) => {
      if (error && error.response && error.response.status === 400) {
        return 'bad-request';
      } else if (error && error.message === 'Network Error') {
        return 'network-error';
      } else {
        console.log(error);
        return 'unknown-error';
      }
    });
}

export function assertNever(n: never): never {
  throw new Error(`never assertion failed, got value ${n}`);
}

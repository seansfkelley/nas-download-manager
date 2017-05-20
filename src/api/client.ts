import { isEqual, every, keys } from 'lodash-es';
import {
  Auth,
  AuthLoginResponse,
  DownloadStation,
  SynologyResponse,
  SessionName
} from './rest';

import { BaseRequest } from './rest/shared';
import * as _ds_infoTypes from './rest/DownloadStation/InfoTypes';
import * as _ds_taskTypes from './rest/DownloadStation/TaskTypes';
import * as _ds_scheduleTypes from './rest/DownloadStation/ScheduleTypes';
import * as _ds_statisticTypes from './rest/DownloadStation/StatisticTypes';

{
  let _unused: BaseRequest = null as any; _unused;
  _ds_infoTypes;
  _ds_taskTypes;
  _ds_scheduleTypes;
  _ds_statisticTypes;
}

const SESSION_TIMEOUT_ERROR_CODE = 106;

export interface ApiClientSettings {
  baseUrl?: string;
  account?: string;
  passwd?: string;
  session?: SessionName;
}

const _settingNames: Record<keyof ApiClientSettings, true> = {
  'baseUrl': true,
  'account': true,
  'passwd': true,
  'session': true
}

const SETTING_NAME_KEYS = keys(_settingNames) as (keyof ApiClientSettings)[];

const TIMEOUT_MESSAGE_REGEX = /timeout of \d+ms exceeded/;

function handleRejection(error: any): ConnectionFailure {
  let failure: ConnectionFailure;
  if (error && error.response && error.response.status === 400) {
    failure = { type: 'probable-wrong-protocol', error };
  } else if (error && error.message === 'Network Error') {
    failure = { type: 'probable-wrong-url-or-no-connection', error };
  } else if (error && TIMEOUT_MESSAGE_REGEX.test(error.message)) {
    // This is a best-effort which I expect to start silently falling back onto 'unknown error' at some point in the future.
    failure = { type: 'timeout', error };
  } else {
    failure = { type: 'unknown', error };
  }
  return failure;
}

export type ConnectionFailure = {
  type: 'missing-config';
} | {
  type: 'probable-wrong-protocol' | 'probable-wrong-url-or-no-connection' | 'timeout' | 'unknown';
  error: any;
}

export function isConnectionFailure(result: SynologyResponse<{}> | ConnectionFailure): result is ConnectionFailure {
  return (result as ConnectionFailure).type != null && (result as SynologyResponse<{}>).success == null;
}

export class ApiClient {
  private sidPromise: Promise<SynologyResponse<AuthLoginResponse>> | undefined;
  private settingsVersion: number = 0;
  private loginAttemptVersion: number = 0;

  constructor(private settings: ApiClientSettings) {}

  public updateSettings(settings: ApiClientSettings) {
    if (!isEqual(this.settings, settings)) {
      this.settingsVersion++;
      this.settings = settings;
      this.maybeLogout();
      return true;
    } else {
      return false;
    }
  }

  private isFullyConfigured() {
    return every(SETTING_NAME_KEYS, k => this.settings[k] != null && this.settings[k]!.length > 0);
  }

  private maybeLogin = (request?: BaseRequest): Promise<SynologyResponse<AuthLoginResponse> | ConnectionFailure> => {
    if (!this.sidPromise) {
      if (!this.isFullyConfigured()) {
        const failure: ConnectionFailure = {
          type: 'missing-config'
        };
        return Promise.resolve(failure);
      } else {
        ++this.loginAttemptVersion;
        this.sidPromise = Auth.Login(this.settings.baseUrl!, {
          ...(request || {}),
          account: this.settings.account!,
          passwd: this.settings.passwd!,
          session: this.settings.session!
        });
        return this.sidPromise.catch(handleRejection);
      }
    } else {
      return this.sidPromise.catch(handleRejection);
    }
  };

  // Note that this method is a BEST EFFORT.
  // (1) Because the client auto-re-logs in when you make new queries, this method will attempt to
  //     only log out the current session. The next non-logout call is guaranteed to attempt to log
  //     back in.
  // (2) The result of this call, either success or failure, has no bearing on future API calls. It
  //     is provided to the caller only for convenience, and may not reflect the true state of the
  //     client or session at the time the promise is resolved.
  private maybeLogout = (request?: BaseRequest): Promise<SynologyResponse<{}> | ConnectionFailure | 'not-logged-in'> => {
    const stashedSidPromise = this.sidPromise;
    this.sidPromise = undefined;

    if (stashedSidPromise) {
      if (!this.isFullyConfigured()) {
        const failure: ConnectionFailure = {
          type: 'missing-config'
        };
        return Promise.resolve(failure);
      } else {
        const { baseUrl, session } = this.settings;
        return stashedSidPromise
          .then(response => {
            if (response.success) {
              return Auth.Logout(baseUrl!, {
                ...(request || {}),
                sid: response.data.sid,
                session: session!
              });
            } else {
              return response;
            }
          })
          .catch(handleRejection);
      }
    } else {
      return Promise.resolve('not-logged-in' as 'not-logged-in');
    }
  };

  private proxy<T, U>(fn: (baseUrl: string, sid: string, options: T) => Promise<SynologyResponse<U>>) {
    const wrappedFunction = (options: T): Promise<SynologyResponse<U> | ConnectionFailure> => {
      const versionAtInit = this.settingsVersion;
      return this.maybeLogin()
        .then(response => {
          if (this.settingsVersion === versionAtInit) {
            if (isConnectionFailure(response)) {
              return Promise.resolve(response);
            } else if (response.success) {
              return fn(this.settings.baseUrl!, response.data.sid, options)
                .then(response => {
                  if (this.settingsVersion === versionAtInit) {
                    return response;
                  } else {
                    return wrappedFunction(options);
                  }
                })
            } else {
              if (response.error.code === SESSION_TIMEOUT_ERROR_CODE) {
                this.sidPromise = undefined;
                return wrappedFunction(options);
              } else {
                return response;
              }
            }
          } else {
            return wrappedFunction(options);
          }
        })
        .catch(handleRejection);
    };

    return wrappedFunction;
  }

  public Auth = {
    Login: this.maybeLogin,
    Logout: this.maybeLogout
  };

  public DownloadStation = {
    Info: {
      GetInfo: this.proxy(DownloadStation.Info.GetInfo),
      GetConfig: this.proxy(DownloadStation.Info.GetConfig),
      SetServerConfig: this.proxy(DownloadStation.Info.SetServerConfig)
    },
    Schedule: {
      GetConfig: this.proxy(DownloadStation.Schedule.GetConfig),
      SetConfig: this.proxy(DownloadStation.Schedule.SetConfig)
    },
    Statistic: {
      GetInfo: this.proxy(DownloadStation.Statistic.GetInfo)
    },
    Task: {
      List: this.proxy(DownloadStation.Task.List),
      GetInfo: this.proxy(DownloadStation.Task.GetInfo),
      Create: this.proxy(DownloadStation.Task.Create),
      Delete: this.proxy(DownloadStation.Task.Delete),
      Pause: this.proxy(DownloadStation.Task.Pause),
      Resume: this.proxy(DownloadStation.Task.Resume),
      Edit: this.proxy(DownloadStation.Task.Edit)
    }
  };
}

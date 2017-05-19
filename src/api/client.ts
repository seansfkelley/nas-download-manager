import { isEqual, some, keys } from 'lodash-es';
import {
  Auth,
  AuthLoginResponse,
  DownloadStation,
  SynologyResponse,
  SessionName,
  errorMessageFromCode
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

export type ConnectionFailure = {
  type: 'missing-config';
} | {
  type: 'other';
  failureMessage: string;
}

export function isConnectionFailure(result: any): result is ConnectionFailure {
  const failure = result as ConnectionFailure;
  return failure.type != null && (failure.type === 'missing-config' || (failure.type === 'other' && (failure.failureMessage != null)));
}

export class ApiClient {
  private sidPromise: Promise<SynologyResponse<AuthLoginResponse>> | undefined;
  private settingsVersion: number = 0;

  constructor(private settings: ApiClientSettings) {}

  public updateSettings(settings: ApiClientSettings) {
    if (!isEqual(this.settings, settings)) {
      this.settingsVersion++;
      this.settings = settings;
      this.sidPromise = undefined;
      return true;
    } else {
      return false;
    }
  }

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

  private proxy<T, U>(fn: (baseUrl: string, sid: string, options: T) => Promise<U>) {
    const wrappedFunction = (options: T): Promise<U | ConnectionFailure> => {
      if (!this.sidPromise) {
        if (some(SETTING_NAME_KEYS, k => !this.settings[k])) {
          const failure: ConnectionFailure = {
            type: 'missing-config'
          };
          return Promise.resolve(failure);
        }

        this.sidPromise = Auth.Login(this.settings.baseUrl!, {
          account: this.settings.account!,
          passwd: this.settings.passwd!,
          session: this.settings.session!,
          timeout: 10000
        });
      }

      const versionAtInit = this.settingsVersion;

      return this.sidPromise
        .then(response => {
          if (this.settingsVersion === versionAtInit) {
            if (response.success) {
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
                const failure: ConnectionFailure = {
                  type: 'other',
                  failureMessage: errorMessageFromCode(response.error.code, Auth.API_NAME)
                };
                return Promise.resolve(failure);
              }
            }
          } else {
            return wrappedFunction(options);
          }
        })
        .catch(error => {
          let failureMessage;
          // TODO: Unify this knowledge with utils.ts and settings.tsx.
          if (error && error.response && error.response.status === 400) {
            failureMessage = 'Connection failure (likely wrong protocol).';
          } else if (error && error.message === 'Network Error') {
            failureMessage = 'Connection failure (likely incorrect hostname/port or no internet connection).';
          } else if (error && error.message === 'timeout of 10000ms exceeded') {
            failureMessage = 'Connection failure (timeout; check your hostname/port settings and internet connection).';
          } else {
            console.log(error);
            failureMessage = 'Unknown error.';
          }

          const failure: ConnectionFailure = { type: 'other', failureMessage };
          return Promise.resolve(failure);
        });
    };

    return wrappedFunction;
  }
}

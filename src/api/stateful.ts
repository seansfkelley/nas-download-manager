import { isEqual, some } from 'lodash-es';
import {
  Auth,
  AuthLoginResponse,
  DownloadStation,
  SynologyResponse,
  SessionName,
  errorMessageFromCode
} from './rest';

import * as _ds_infoTypes from './rest/DownloadStation/InfoTypes';
import * as _ds_taskTypes from './rest/DownloadStation/TaskTypes';
import * as _ds_scheduleTypes from './rest/DownloadStation/ScheduleTypes';
import * as _ds_statisticTypes from './rest/DownloadStation/StatisticTypes';

{
  _ds_infoTypes;
  _ds_taskTypes;
  _ds_scheduleTypes;
  _ds_statisticTypes;
}

const SESSION_TIMEOUT_ERROR_CODE = 106;

export interface ApiSettings {
  baseUrl?: string;
  account?: string;
  passwd?: string;
  session: SessionName;
}

export interface ConnectionFailureMessage {
  failureMessage: string;
}

export class StatefulApi {
  private sidPromise: Promise<SynologyResponse<AuthLoginResponse>> | undefined;

  constructor(private settings: ApiSettings) {}

  public updateSettings(settings: ApiSettings) {
    if (!isEqual(this.settings, settings)) {
      this.settings = settings;
      this.sidPromise = undefined;
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

  private proxy<T, U>(fn: (baseUrl: string, sid: string, options: T) => Promise<U>): (options: T) => Promise<U | ConnectionFailureMessage> {
    const wrappedFunction = (options: T): Promise<U | ConnectionFailureMessage> => {
      if (!this.sidPromise) {
        if (some(this.settings, s => !!s)) {
          return Promise.resolve({ failureMessage: 'Missing connection settings.' });
        }

        this.sidPromise = Auth.Login(this.settings.baseUrl!, {
          account: this.settings.account!,
          passwd: this.settings.passwd!,
          session: this.settings.session!
        });
      }

      return this.sidPromise
        .then(response => {
          if (response.success) {
            return fn(this.settings.baseUrl!, response.data.sid, options) as Promise<U | ConnectionFailureMessage>;
          } else {
            if (response.error.code === SESSION_TIMEOUT_ERROR_CODE) {
              this.sidPromise = undefined;
              return wrappedFunction(options);
            } else {
              return Promise.resolve({
                failureMessage: errorMessageFromCode(response.error.code, 'auth')
              });
            }
          }
        });
    };

    return wrappedFunction;
  }
}

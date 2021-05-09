import { Auth, AuthLoginResponse } from "./Auth";
import { DownloadStation } from "./DownloadStation";
import { DownloadStation2 } from "./DownloadStation2";
import { FileStation } from "./FileStation";
import { Info } from "./Info";
import {
  SessionName,
  RestApiResponse,
  RestApiFailureResponse,
  BaseRequest,
  BadResponseError,
  TimeoutError,
  NetworkError,
} from "./shared";

const NO_SUCH_METHOD_ERROR_CODE = 103;
const NO_PERMISSIONS_ERROR_CODE = 105;
const SESSION_TIMEOUT_ERROR_CODE = 106;

export interface SynologyClientSettings {
  baseUrl: string;
  account: string;
  passwd: string;
  session: SessionName;
}

const SETTING_NAME_KEYS = (function () {
  const _settingNames: Record<keyof SynologyClientSettings, true> = {
    baseUrl: true,
    account: true,
    passwd: true,
    session: true,
  };
  return Object.keys(_settingNames) as (keyof SynologyClientSettings)[];
})();

export type ConnectionFailure =
  | {
      type: "missing-config";
    }
  | {
      type:
        | "probable-wrong-protocol"
        | "probable-wrong-url-or-no-connection-or-cert-error"
        | "timeout"
        | "unknown";
      error: any;
    };

const ConnectionFailure = {
  from: (error: any): ConnectionFailure => {
    if (error instanceof BadResponseError && error.response.status === 400) {
      return { type: "probable-wrong-protocol", error };
    } else if (error instanceof NetworkError) {
      return { type: "probable-wrong-url-or-no-connection-or-cert-error", error };
    } else if (error instanceof TimeoutError) {
      return { type: "timeout", error };
    } else {
      return { type: "unknown", error };
    }
  },
};

export type ClientRequestResult<T> = RestApiResponse<T> | ConnectionFailure;

export const ClientRequestResult = {
  isConnectionFailure: (result: ClientRequestResult<unknown>): result is ConnectionFailure => {
    return (
      (result as ConnectionFailure).type != null &&
      (result as RestApiResponse<unknown>).success == null
    );
  },
};

export class SynologyClient {
  private loginPromise: Promise<ClientRequestResult<AuthLoginResponse>> | undefined;
  private settingsVersion: number = 0;
  private onSettingsChangeListeners: (() => void)[] = [];

  constructor(private settings: Partial<SynologyClientSettings>) {}

  public updateSettings(settings: Partial<SynologyClientSettings>) {
    if (SETTING_NAME_KEYS.some((k) => settings[k] !== this.settings[k])) {
      this.settingsVersion++;
      this.settings = settings;
      this.maybeLogout();
      return true;
    } else {
      return false;
    }
  }

  public onSettingsChange(listener: () => void) {
    this.onSettingsChangeListeners.push(listener);
    let isSubscribed = true;
    return () => {
      if (isSubscribed) {
        this.onSettingsChangeListeners = this.onSettingsChangeListeners.filter(
          (l) => l !== listener,
        );
        isSubscribed = false;
      }
    };
  }

  private getValidatedSettings() {
    if (
      SETTING_NAME_KEYS.every((k) => {
        const v = this.settings[k];
        return v != null && v.length > 0;
      })
    ) {
      return this.settings as SynologyClientSettings;
    } else {
      return undefined;
    }
  }

  private maybeLogin = async (request?: BaseRequest) => {
    const settings = this.getValidatedSettings();
    if (settings == null) {
      const failure: ConnectionFailure = {
        type: "missing-config",
      };
      return failure;
    } else if (!this.loginPromise) {
      const { baseUrl, ...restSettings } = settings;
      this.loginPromise = Auth.Login(baseUrl, {
        ...request,
        ...restSettings,
        // First try with the lowest version that we can that supports sid, in an attempt to
        // support the oldest DSMs we can.
        version: 2,
      })
        .then((response) => {
          // We guess we're on DSM 7, which does not support earlier versions of the API.
          // We'd like to do this with an Info.Query, but DSM 7 erroneously reports that it
          // supports version 2, which it definitely does not.
          if (!response.success && response.error.code === NO_SUCH_METHOD_ERROR_CODE) {
            return Auth.Login(baseUrl, {
              ...request,
              ...restSettings,
              version: 3,
            });
          } else {
            return response;
          }
        })
        .catch((e) => ConnectionFailure.from(e));
    }

    return this.loginPromise;
  };

  // Note that this method is a BEST EFFORT.
  // (1) Because the client auto-re-logs in when you make new queries, this method will attempt to
  //     only log out the current session. The next non-logout call is guaranteed to attempt to log
  //     back in.
  // (2) The result of this call, either success or failure, has no bearing on future API calls. It
  //     is provided to the caller only for convenience, and may not reflect the true state of the
  //     client or session at the time the promise is resolved.
  private maybeLogout = async (
    request?: BaseRequest,
  ): Promise<ClientRequestResult<{}> | "not-logged-in"> => {
    const stashedLoginPromise = this.loginPromise;
    const settings = this.getValidatedSettings();
    this.loginPromise = undefined;

    if (!stashedLoginPromise) {
      return "not-logged-in" as const;
    } else if (settings == null) {
      const failure: ConnectionFailure = {
        type: "missing-config",
      };
      return failure;
    } else {
      const response = await stashedLoginPromise;
      if (ClientRequestResult.isConnectionFailure(response)) {
        return response;
      } else if (response.success) {
        const { baseUrl, session } = settings;
        try {
          return await Auth.Logout(baseUrl, {
            ...request,
            sid: response.data.sid,
            session: session,
          });
        } catch (e) {
          return ConnectionFailure.from(e);
        }
      } else {
        return response;
      }
    }
  };

  private proxy<T, U>(
    fn: (baseUrl: string, sid: string, options: T) => Promise<RestApiResponse<U>>,
  ): (options: T) => Promise<ClientRequestResult<U>> {
    const wrappedFunction = async (
      options: T,
      shouldRetryRoutineFailures: boolean = true,
    ): Promise<ClientRequestResult<U>> => {
      const versionAtInit = this.settingsVersion;

      const maybeLogoutAndRetry = async (
        result: ConnectionFailure | RestApiFailureResponse,
      ): Promise<ClientRequestResult<U>> => {
        if (
          shouldRetryRoutineFailures &&
          (ClientRequestResult.isConnectionFailure(result) ||
            result.error.code === SESSION_TIMEOUT_ERROR_CODE ||
            result.error.code === NO_PERMISSIONS_ERROR_CODE)
        ) {
          this.loginPromise = undefined;
          return wrappedFunction(options, false);
        } else {
          return result;
        }
      };

      try {
        // `await`s in this block aren't necessary to adhere to the type signature, but it changes
        // who's responsible for handling the errors. Currently, errors unhandled by lower levels
        // are bubbled up to this outermost `catch`.

        const loginResult = await this.maybeLogin();

        if (this.settingsVersion !== versionAtInit) {
          return await wrappedFunction(options);
        } else if (ClientRequestResult.isConnectionFailure(loginResult) || !loginResult.success) {
          return await maybeLogoutAndRetry(loginResult);
        } else {
          const response = await fn(this.settings.baseUrl!, loginResult.data.sid, options);

          if (this.settingsVersion !== versionAtInit) {
            return await wrappedFunction(options);
          } else if (response.success) {
            return response;
          } else {
            return await maybeLogoutAndRetry(response);
          }
        }
      } catch (e) {
        return ConnectionFailure.from(e);
      }
    };

    return wrappedFunction;
  }

  private proxyOptionalArgs<T, U>(
    fn: (baseUrl: string, sid: string, options?: T) => Promise<RestApiResponse<U>>,
  ): (options?: T) => Promise<ClientRequestResult<U>> {
    return this.proxy(fn);
  }

  private proxyWithoutAuth<T, U>(
    fn: (baseUrl: string, options: T) => Promise<RestApiResponse<U>>,
  ): (options: T) => Promise<ClientRequestResult<U>> {
    return async (options: T) => {
      const settings = this.getValidatedSettings();
      if (settings == null) {
        const response: ConnectionFailure = {
          type: "missing-config",
        };
        return response;
      } else {
        try {
          return await fn(settings.baseUrl, options);
        } catch (e) {
          return ConnectionFailure.from(e);
        }
      }
    };
  }

  public Auth = {
    Login: this.maybeLogin,
    Logout: this.maybeLogout,
  };

  public Info = {
    Query: this.proxyWithoutAuth(Info.Query),
  };

  public DownloadStation = {
    Info: {
      GetInfo: this.proxyOptionalArgs(DownloadStation.Info.GetInfo),
      GetConfig: this.proxyOptionalArgs(DownloadStation.Info.GetConfig),
      SetServerConfig: this.proxy(DownloadStation.Info.SetServerConfig),
    },
    Schedule: {
      GetConfig: this.proxyOptionalArgs(DownloadStation.Schedule.GetConfig),
      SetConfig: this.proxy(DownloadStation.Schedule.SetConfig),
    },
    Statistic: {
      GetInfo: this.proxyOptionalArgs(DownloadStation.Statistic.GetInfo),
    },
    Task: {
      List: this.proxyOptionalArgs(DownloadStation.Task.List),
      GetInfo: this.proxy(DownloadStation.Task.GetInfo),
      Create: this.proxy(DownloadStation.Task.Create),
      Delete: this.proxy(DownloadStation.Task.Delete),
      Pause: this.proxy(DownloadStation.Task.Pause),
      Resume: this.proxy(DownloadStation.Task.Resume),
      Edit: this.proxy(DownloadStation.Task.Edit),
    },
  };

  public DownloadStation2 = {
    Task: {
      Create: this.proxy(DownloadStation2.Task.Create),
    },
  };

  public FileStation = {
    Info: {
      get: this.proxy(FileStation.Info.get),
    },
    List: {
      list_share: this.proxyOptionalArgs(FileStation.List.list_share),
      list: this.proxy(FileStation.List.list),
      getinfo: this.proxy(FileStation.List.getinfo),
    },
  };
}

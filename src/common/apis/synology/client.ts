import { typesafeUnionMembers } from "../../lang";
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
  otp_code: string;
  device_id: string;
  device_name: string;
}

const SETTING_NAME_KEY_FLAGS = {
  baseUrl: true,
  account: true,
  passwd: true,
  session: true,
  otp_code: false,
  device_id: false,
  device_name: false,
};

const SETTING_NAME_KEYS = typesafeUnionMembers<keyof SynologyClientSettings>(
  SETTING_NAME_KEY_FLAGS,
);

export type ConnectionFailure =
  | {
      type: "missing-config";
      which: "password" | "other";
    }
  | {
      type:
        | "probable-wrong-protocol"
        | "probable-wrong-url-or-no-connection-or-cert-error"
        | "timeout"
        | "unknown";
      error: any;
    };

function isConnectionFailure(
  v: SynologyClientSettings | ConnectionFailure,
): v is ConnectionFailure {
  return (v as ConnectionFailure).type != null;
}

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

  constructor(private settings: Partial<SynologyClientSettings>) {}

  public partiallyUpdateSettings(settings: Partial<SynologyClientSettings>) {
    const updatedSettings = { ...this.settings, ...settings };
    if (SETTING_NAME_KEYS.some((k) => updatedSettings[k] !== this.settings[k])) {
      this.settingsVersion++;
      this.settings = updatedSettings;
      this.maybeLogout();
      return true;
    } else {
      return false;
    }
  }

  private getValidatedSettings(): SynologyClientSettings | ConnectionFailure {
    const missingFields = SETTING_NAME_KEYS.filter((k) => {
      if (SETTING_NAME_KEY_FLAGS[k]) {
        const v = this.settings[k];
        return v == null || v.length === 0;
      }
      return false;
    });
    if (missingFields.length === 0) {
      return this.settings as SynologyClientSettings;
    } else {
      return {
        type: "missing-config",
        which: missingFields.length === 1 && missingFields[0] === "passwd" ? "password" : "other",
      };
    }
  }

  private maybeLogin = async (request?: BaseRequest) => {
    const settings = this.getValidatedSettings();
    if (isConnectionFailure(settings)) {
      return settings;
    } else if (!this.loginPromise) {
      const { baseUrl, device_id, otp_code, ...restSettings } = settings;

      let option: any = {
        ...request,
        ...restSettings,
        version: 2,
      };

      if (device_id) {
        option.device_id = device_id;
        option.device_name = settings.device_name;
        option.version = 6;
      } else if (otp_code) {
        option.otp_code = otp_code;
        option.enable_device_token = "yes";
        option.version = 6;
      }

      this.loginPromise = Auth.Login(baseUrl, option)
        .then((response) => {
          // We guess we're on DSM 7, which does not support earlier versions of the API.
          // We'd like to do this with an Info.Query, but DSM 7 erroneously reports that it
          // supports version 2, which it definitely does not.
          if (!response.success && response.error.code === NO_SUCH_METHOD_ERROR_CODE) {
            option.version = 3;
            return Auth.Login(baseUrl, option);
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
    } else if (isConnectionFailure(settings)) {
      return settings;
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
      if (isConnectionFailure(settings)) {
        return settings;
      } else {
        try {
          // TODO: This should do the same settings-version-checking that `this.proxy` does.
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

import isEqual from "lodash/isEqual";
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

// These fields uniquely identify a session, which we can use to determine if we are able to reuse
// auth tokens for future requests or have to log in again.
export interface SynologySessionKey {
  baseUrl: string;
  account: string;
  session: SessionName;
}

export interface SynologyClientSettings extends SynologySessionKey {
  passwd: string;
}

const SETTING_NAME_KEYS = typesafeUnionMembers<keyof SynologyClientSettings>({
  baseUrl: true,
  account: true,
  passwd: true,
  session: true,
});

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
      // This doesn't store the error so that it remains safely JSON-serializable. This can be a
      // problem if we were to try to store this in browser.storage, some of which might throw with
      // non-JSONifiable values.
    };

function isConnectionFailure(
  v: SynologyClientSettings | ConnectionFailure,
): v is ConnectionFailure {
  return (v as ConnectionFailure).type != null;
}

const ConnectionFailure = {
  from: (error: unknown): ConnectionFailure => {
    if (error instanceof BadResponseError && error.response.status === 400) {
      return { type: "probable-wrong-protocol" };
    } else if (error instanceof NetworkError) {
      return { type: "probable-wrong-url-or-no-connection-or-cert-error" };
    } else if (error instanceof TimeoutError) {
      return { type: "timeout" };
    } else {
      return { type: "unknown" };
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

export type SynologyAuthResult = ClientRequestResult<AuthLoginResponse>;

export class SynologyClient {
  // Only ever a login in flight, so that concurrent requests share one. The settled result lives in
  // auth, which is what makes it something a caller can hand us back later.
  private loginPromise: Promise<SynologyAuthResult> | undefined;

  constructor(
    // Fixed for the client's lifetime. New auth settings means make a new client.
    private readonly settings: Partial<SynologyClientSettings>,
    // Reuse auth from a previous client, if available, to avoid additional login round-trips.
    private auth: SynologyAuthResult | undefined,
    // Whenever we auth, call back so any future clients can reuse it.
    private onAuthChange: ((auth: SynologyAuthResult | undefined) => void) | undefined,
  ) {}

  private setAuth(auth: SynologyAuthResult | undefined) {
    if (!isEqual(this.auth, auth)) {
      this.auth = auth;
      this.onAuthChange?.(auth);
    }
  }

  private getValidatedSettings(): SynologyClientSettings | ConnectionFailure {
    const missingFields = SETTING_NAME_KEYS.filter((k) => {
      const v = this.settings[k];
      return v == null || v.length === 0;
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

  private maybeLogin = async (request?: BaseRequest): Promise<SynologyAuthResult> => {
    const settings = this.getValidatedSettings();
    if (isConnectionFailure(settings)) {
      return settings;
    } else if (this.auth != null) {
      return this.auth;
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
        .catch((e) => ConnectionFailure.from(e))
        .then((result) => {
          this.loginPromise = undefined;
          this.setAuth(result);
          return result;
        });
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
    const stashedLoginPromise = this.auth != null ? Promise.resolve(this.auth) : this.loginPromise;
    const settings = this.getValidatedSettings();
    this.loginPromise = undefined;
    this.setAuth(undefined);

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
          this.setAuth(undefined);
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

        if (ClientRequestResult.isConnectionFailure(loginResult) || !loginResult.success) {
          return await maybeLogoutAndRetry(loginResult);
        } else {
          const response = await fn(this.settings.baseUrl!, loginResult.data.sid, options);

          if (response.success) {
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

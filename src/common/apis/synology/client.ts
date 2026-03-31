import { typesafeUnionMembers } from "../../lang";
import { Auth, AuthLoginResponse } from "./Auth";
import { Task } from "./DownloadStation/Task";
import { Info as DSInfo } from "./DownloadStation/Info";
import { List } from "./FileStation/List";
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

const NO_PERMISSIONS_ERROR_CODE = 105;
const SESSION_TIMEOUT_ERROR_CODE = 106;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CONNECTION_RETRY_DELAYS = [5000, 10000, 20000];

function isRetryableConnectionFailure(failure: ConnectionFailure): boolean {
  return (
    failure.type === "probable-wrong-url-or-no-connection-or-cert-error" ||
    failure.type === "timeout"
  );
}

export interface SynologyClientSettings {
  baseUrl: string;
  account: string;
  passwd: string;
  session: SessionName;
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
      type: "probable-wrong-protocol";
      error: BadResponseError;
    }
  | {
      type: "probable-wrong-url-or-no-connection-or-cert-error";
      error: NetworkError;
    }
  | {
      type: "timeout";
      error: TimeoutError;
    }
  | {
      type: "unknown";
      error: unknown;
    };

function isConnectionFailure(
  v: SynologyClientSettings | ConnectionFailure,
): v is ConnectionFailure {
  return (v as ConnectionFailure).type != null;
}

const ConnectionFailure = {
  from: (error: unknown): ConnectionFailure => {
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
  private synotoken: string = "";
  private onSessionChange?: (sid: string, synotoken: string) => void;
  private onSessionClear?: () => void;
  private loadCachedSession?: () => Promise<{ sid: string; synotoken: string } | undefined>;
  private sessionCleared = false;

  constructor(
    private settings: Partial<SynologyClientSettings>,
    options?: {
      onSessionChange?: (sid: string, synotoken: string) => void;
      onSessionClear?: () => void;
      loadCachedSession?: () => Promise<{ sid: string; synotoken: string } | undefined>;
    },
  ) {
    this.onSessionChange = options?.onSessionChange;
    this.onSessionClear = options?.onSessionClear;
    this.loadCachedSession = options?.loadCachedSession;
  }

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

  private maybeLogin = async (request?: BaseRequest) => {
    const settings = this.getValidatedSettings();
    if (isConnectionFailure(settings)) {
      return settings;
    } else if (!this.loginPromise) {
      // Try to restore a cached session before making a network login call.
      // Skip cache if sessionCleared is set — the cached session is stale.
      if (this.loadCachedSession && !this.sessionCleared) {
        console.log("[session] no loginPromise, trying cached session");
        const cached = await this.loadCachedSession();
        if (cached?.sid) {
          console.log("[session] restoring session from cache");
          this.synotoken = cached.synotoken;
          this.loginPromise = Promise.resolve({
            success: true as const,
            data: cached,
            meta: { apiGroup: "Auth", method: "login", version: 6 },
          });
          return this.loginPromise;
        }
      }

      console.log("[session] performing fresh login");
      const { baseUrl, ...restSettings } = settings;
      this.loginPromise = Auth.Login(baseUrl, {
        ...request,
        ...restSettings,
        version: 6,
      })
        .then((response) => {
          if (response.success) {
            this.sessionCleared = false;
            this.synotoken = response.data.synotoken;
            this.onSessionChange?.(response.data.sid, response.data.synotoken);
          }
          return response;
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
    console.log("[session] clearing loginPromise (logout)");
    this.loginPromise = undefined;
    this.synotoken = "";
    this.sessionCleared = true;
    this.onSessionClear?.();

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
    fn: (
      baseUrl: string,
      sid: string,
      options: T,
      synotoken: string,
    ) => Promise<RestApiResponse<U>>,
  ): (options: T) => Promise<ClientRequestResult<U>> {
    const wrappedFunction = async (
      options: T,
      shouldRetryRoutineFailures: boolean = true,
      connectionRetryCount: number = 0,
    ): Promise<ClientRequestResult<U>> => {
      const versionAtInit = this.settingsVersion;

      const maybeLogoutAndRetry = async (
        result: ConnectionFailure | RestApiFailureResponse,
        loginSucceeded: boolean,
      ): Promise<ClientRequestResult<U>> => {
        if (
          shouldRetryRoutineFailures &&
          (ClientRequestResult.isConnectionFailure(result) ||
            result.error.code === SESSION_TIMEOUT_ERROR_CODE ||
            result.error.code === NO_PERMISSIONS_ERROR_CODE)
        ) {
          // Only clear loginPromise when the NAS told us our session is invalid
          // (auth errors 105/106) or when login itself failed. Connection failures
          // from API calls do NOT invalidate the session — the NAS just didn't respond.
          const isAuthError =
            !ClientRequestResult.isConnectionFailure(result) &&
            (result.error.code === SESSION_TIMEOUT_ERROR_CODE ||
              result.error.code === NO_PERMISSIONS_ERROR_CODE);

          if (!loginSucceeded || isAuthError) {
            this.loginPromise = undefined;
            this.sessionCleared = true;
            this.onSessionClear?.();
          }

          return wrappedFunction(options, false, connectionRetryCount);
        } else if (
          ClientRequestResult.isConnectionFailure(result) &&
          isRetryableConnectionFailure(result) &&
          connectionRetryCount < CONNECTION_RETRY_DELAYS.length
        ) {
          const delay = CONNECTION_RETRY_DELAYS[connectionRetryCount];
          console.warn(
            `Connection failed (${result.type}), retrying in ${delay / 1000}s (attempt ${connectionRetryCount + 1}/${CONNECTION_RETRY_DELAYS.length})`,
          );
          await sleep(delay);
          return wrappedFunction(options, true, connectionRetryCount + 1);
        } else {
          if (ClientRequestResult.isConnectionFailure(result)) {
            console.error(`Connection failed (${result.type}), no more retries`);
          }
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
          return await maybeLogoutAndRetry(loginResult, false);
        } else {
          const response = await fn(
            this.settings.baseUrl!,
            loginResult.data.sid,
            options,
            this.synotoken,
          );

          if (this.settingsVersion !== versionAtInit) {
            return await wrappedFunction(options);
          } else if (response.success) {
            return response;
          } else {
            return await maybeLogoutAndRetry(response, true);
          }
        }
      } catch (e) {
        const failure = ConnectionFailure.from(e);

        if (
          isRetryableConnectionFailure(failure) &&
          connectionRetryCount < CONNECTION_RETRY_DELAYS.length
        ) {
          const delay = CONNECTION_RETRY_DELAYS[connectionRetryCount];
          console.warn(
            `Connection failed (${failure.type}), retrying in ${delay / 1000}s (attempt ${connectionRetryCount + 1}/${CONNECTION_RETRY_DELAYS.length})`,
          );
          await sleep(delay);
          return wrappedFunction(options, true, connectionRetryCount + 1);
        }

        console.error(`Connection failed (${failure.type}), no more retries`);
        return failure;
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
      GetConfig: this.proxyOptionalArgs(DSInfo.GetConfig),
    },
    Task: {
      List: this.proxyOptionalArgs(Task.List),
      Create: this.proxy(Task.Create),
      Delete: this.proxy(Task.Delete),
      Pause: this.proxy(Task.Pause),
      Resume: this.proxy(Task.Resume),
    },
  };

  public FileStation = {
    List: {
      list_share: this.proxyOptionalArgs(List.list_share),
      list: this.proxy(List.list),
      getinfo: this.proxy(List.getinfo),
    },
  };
}

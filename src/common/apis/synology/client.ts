import { typesafeUnionMembers } from "../../lang";
import { ConnectionSettings, getHostUrl } from "../../state";

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

const STALE_SESSION_ERROR_CODES = [
  105, // The logged-in session does not have permission.
  106, // Session timeout.
  107, // Session interrupted by duplicate login.
  119, // SID not found.
];

const AUTH_ERROR_CODES_REQUIRING_USER_INTERVENTION = [
  400, // No such username or incorrect password.
  401, // Account disabled.
  402, // Permission denied.
  403, // Two-step verification needed.
  404, // Two-step verification failed.
];

export interface SynologyClientSettings {
  baseUrl: string;
  account: string;
  passwd: string;
  session: SessionName;
}

export const SynologyClientSettings = {
  fromConnection: (
    connection: ConnectionSettings | undefined,
    password: string | undefined = connection?.password,
  ): SynologyClientSettings | ConnectionFailure => {
    const settings: Partial<SynologyClientSettings> = {
      baseUrl: connection != null ? getHostUrl(connection) : undefined,
      account: connection?.username,
      passwd: password,
      session: SessionName.DownloadStation,
    };

    const missingKeys = SETTING_NAME_KEYS.filter((k) => {
      const v = settings[k];
      return v == null || v.length === 0;
    });

    if (missingKeys.length === 0) {
      return settings as SynologyClientSettings;
    } else {
      return {
        type: "missing-config",
        which: missingKeys.length === 1 && missingKeys[0] === "passwd" ? "password" : "other",
      };
    }
  },

  isEqual: (a: SynologyClientSettings, b: SynologyClientSettings): boolean => {
    return SETTING_NAME_KEYS.every((k) => a[k] === b[k]);
  },
};

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
    };

export const ConnectionFailure = {
  is: (settings: SynologyClientSettings | ConnectionFailure): settings is ConnectionFailure => {
    return (settings as ConnectionFailure).type != null;
  },

  from: (error: any): ConnectionFailure => {
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

export type LoginFailure = ConnectionFailure | RestApiFailureResponse;

export const LoginFailure = {
  requiresUserIntervention: (failure: LoginFailure): boolean => {
    if (ClientRequestResult.isConnectionFailure(failure)) {
      switch (failure.type) {
        case "missing-config":
        case "probable-wrong-protocol":
        case "probable-wrong-url-or-no-connection-or-cert-error":
        case "unknown":
          return true;
        case "timeout":
          return false;
      }
    } else {
      return AUTH_ERROR_CODES_REQUIRING_USER_INTERVENTION.includes(failure.error.code);
    }
  },
};

export type SynologyAuth = { sid: string } | LoginFailure;

export const SynologyAuth = {
  isSuccess: (auth: SynologyAuth) => "sid" in auth,
};

function toSynologyAuth(response: ClientRequestResult<AuthLoginResponse>): SynologyAuth {
  if (ClientRequestResult.isConnectionFailure(response)) {
    return response;
  } else if (response.success) {
    return { sid: response.data.sid };
  } else {
    return response;
  }
}

export class SynologyClient {
  private inflightLogin:
    | { settings: SynologyClientSettings; promise: Promise<ClientRequestResult<AuthLoginResponse>> }
    | undefined;

  constructor(
    public getSettings: () => Promise<SynologyClientSettings | ConnectionFailure>,
    private getStoredAuth: (settings: SynologyClientSettings) => Promise<SynologyAuth | undefined>,
    private onAuthChange: (
      settings: SynologyClientSettings,
      auth: SynologyAuth | undefined,
    ) => Promise<void>,
  ) {}

  private getLoginPromiseForSettings(settings: SynologyClientSettings) {
    if (
      this.inflightLogin != null &&
      SynologyClientSettings.isEqual(this.inflightLogin.settings, settings)
    ) {
      return this.inflightLogin.promise;
    } else {
      return undefined;
    }
  }

  private maybeLogIn = async (
    settings: SynologyClientSettings,
    request?: BaseRequest,
  ): Promise<ClientRequestResult<AuthLoginResponse>> => {
    const inflight = this.getLoginPromiseForSettings(settings);
    if (inflight != null) {
      return inflight;
    }

    const promise = (async () => {
      const { baseUrl, ...credentials } = settings;
      try {
        const response = await Auth.Login(baseUrl, {
          ...request,
          ...credentials,
          // First try with the lowest version that we can that supports sid, in an attempt to
          // support the oldest DSMs we can.
          version: 2,
        });

        // We guess we're on DSM 7, which does not support earlier versions of the API.
        // We'd like to do this with an Info.Query, but DSM 7 erroneously reports that it
        // supports version 2, which it definitely does not.
        if (!response.success && response.error.code === NO_SUCH_METHOD_ERROR_CODE) {
          return await Auth.Login(baseUrl, { ...request, ...credentials, version: 3 });
        } else {
          return response;
        }
      } catch (e) {
        return ConnectionFailure.from(e);
      }
    })();

    this.inflightLogin = { settings, promise };
    const response = await promise;

    if (this.inflightLogin?.promise !== promise) {
      throw new Error("in-flight login superseded; this promise is no longer valid");
    }
    this.inflightLogin = undefined;

    const auth = toSynologyAuth(response);
    if (SynologyAuth.isSuccess(auth) || LoginFailure.requiresUserIntervention(auth)) {
      await this.onAuthChange(settings, auth);
    }

    return response;
  };

  private clearAuth = async (settings: SynologyClientSettings) => {
    if (this.getLoginPromiseForSettings(settings) != null) {
      this.inflightLogin = undefined;
    }
    await this.onAuthChange(settings, undefined);
  };

  // Note that this method is a BEST EFFORT. It only logs out the session this client can see, and
  // the next non-logout call is guaranteed to attempt to log back in. The result is provided for
  // convenience and may not reflect the true state of the session by the time it resolves.
  private maybeLogOut = async (
    request?: BaseRequest,
  ): Promise<ClientRequestResult<{}> | "not-logged-in"> => {
    const settings = await this.getSettings();
    if (ConnectionFailure.is(settings)) {
      return settings;
    }

    const inflight = this.getLoginPromiseForSettings(settings);
    const lastKnownAuth = inflight == null ? await this.getStoredAuth(settings) : undefined;

    // We can unconditionally clear the underlying storage because it is the consumer's
    // responsibility to ensure that multiple clients sharing storage are coordinated, if that is
    // desired.
    await this.clearAuth(settings);

    if (inflight != null) {
      // Drop it on the floor; at this point, we're just trying to help out the NAS to allow it to
      // clear any session tokens, but we ourselves don't care.
      inflight.then((response) => {
        const abandoned = toSynologyAuth(response);
        if (SynologyAuth.isSuccess(abandoned)) {
          return Auth.Logout(settings.baseUrl, {
            ...request,
            sid: abandoned.sid,
            session: settings.session,
          });
        } else {
          return undefined;
        }
      });
    }

    if (lastKnownAuth == null) {
      return "not-logged-in" as const;
    } else if (SynologyAuth.isSuccess(lastKnownAuth)) {
      return await Auth.Logout(settings.baseUrl, {
        ...request,
        sid: lastKnownAuth.sid,
        session: settings.session,
      });
    } else {
      return lastKnownAuth;
    }
  };

  private proxy<T, U>(
    fn: (baseUrl: string, sid: string, options: T) => Promise<RestApiResponse<U>>,
  ): (options: T) => Promise<ClientRequestResult<U>> {
    const wrappedFunction = async (
      options: T,
      shouldRetryTransientFailures: boolean = true,
    ): Promise<ClientRequestResult<U>> => {
      try {
        // `await`s in this block aren't necessary to adhere to the type signature, but it changes
        // who's responsible for handling the errors. Currently, errors unhandled by lower levels
        // are bubbled up to this outermost `catch`.

        // Resolved once and threaded through the whole request: re-reading it partway would let a
        // settings change mid-flight clear auth that belongs to the new settings.
        const settings = await this.getSettings();

        if (ConnectionFailure.is(settings)) {
          return settings;
        }

        const auth =
          (await this.getStoredAuth(settings)) ?? toSynologyAuth(await this.maybeLogIn(settings));

        if (!SynologyAuth.isSuccess(auth)) {
          // A stored failure is one we already decided retrying cannot fix.
          if (shouldRetryTransientFailures && !LoginFailure.requiresUserIntervention(auth)) {
            await this.clearAuth(settings);
            return await wrappedFunction(options, false);
          } else {
            return auth;
          }
        }

        const response = await fn(settings.baseUrl, auth.sid, options);

        if (
          !response.success &&
          shouldRetryTransientFailures &&
          STALE_SESSION_ERROR_CODES.includes(response.error.code)
        ) {
          await this.clearAuth(settings);
          return await wrappedFunction(options, false);
        } else {
          return response;
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
      try {
        const settings = await this.getSettings();
        return ConnectionFailure.is(settings) ? settings : await fn(settings.baseUrl, options);
      } catch (e) {
        return ConnectionFailure.from(e);
      }
    };
  }

  public Auth = {
    Login: async (request?: BaseRequest): Promise<ClientRequestResult<AuthLoginResponse>> => {
      const settings = await this.getSettings();
      return ConnectionFailure.is(settings) ? settings : await this.maybeLogIn(settings, request);
    },
    Logout: this.maybeLogOut,
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

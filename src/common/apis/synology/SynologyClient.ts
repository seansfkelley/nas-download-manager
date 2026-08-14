import { typesafeUnionMembers } from "../../lang";
import { ConnectionSettings, getHostUrl } from "../../state";
import { OmitStrict } from "../../types";

import { Auth, AuthLoginRequest, AuthLoginResponse } from "./Auth";
import { DownloadStation } from "./DownloadStation";
import { DownloadStation2 } from "./DownloadStation2";
import { FileStation } from "./FileStation";
import { Info } from "./Info";
import {
  BadResponseError,
  BaseRequest,
  NetworkError,
  RestApiFailureResponse,
  RestApiResponse,
  SessionName,
  TimeoutError,
} from "./shared";

const UNSUPPORTED_API_VERSION_ERROR_CODES = [
  103, // The requested method does not exist. DSM 7 reports this for versions it is too new for.
  104, // The requested version does not support the functionality.
];

// Shown in DSM's list of trusted devices, under Control Panel > Security > Account.
const DEVICE_NAME = "NAS Download Manager";

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
  406, // Two-step verification enforced for this account.
  407, // Blocked IP source.
  408, // Expired password cannot be changed.
  409, // Expired password.
  410, // Password must be changed.
];

export interface SynologyLoginParameters {
  baseUrl: string;
  account: string;
  passwd: string;
  session: SessionName;
  deviceToken?: string;
  otpCode?: string;
}

export const SynologyLoginParameters = {
  fromConnection: (
    connection: ConnectionSettings | undefined,
    password: string | undefined = connection?.password,
    deviceToken: string | undefined = connection?.deviceToken,
    otpCode?: string,
  ): SynologyLoginParameters | ConnectionFailure => {
    const login: Partial<SynologyLoginParameters> = {
      baseUrl: connection != null ? getHostUrl(connection) : undefined,
      account: connection?.username,
      passwd: password,
      session: SessionName.DownloadStation,
      deviceToken,
      otpCode,
    };

    const missingKeys = MINIMUM_LOGIN_KEYS_REQUIRED.filter((k) => {
      const v = login[k];
      return v == null || v.length === 0;
    });

    if (missingKeys.length === 0) {
      return login as SynologyLoginParameters;
    } else {
      return {
        type: "missing-config",
        which: missingKeys.length === 1 && missingKeys[0] === "passwd" ? "password" : "other",
      };
    }
  },

  // n.b. this is _not_ equality, but semantic equivalence for the purposes of caching.
  isEquivalent: (a: SynologyLoginParameters, b: SynologyLoginParameters): boolean => {
    return LOGIN_CACHE_KEY_FIELDS.every((k) => a[k] === b[k]);
  },
};

// Which keys we can fail-fast as definitely being misconfigured, if missing.
const MINIMUM_LOGIN_KEYS_REQUIRED = typesafeUnionMembers<
  keyof OmitStrict<SynologyLoginParameters, "deviceToken" | "otpCode">
>({
  baseUrl: true,
  account: true,
  passwd: true,
  session: true,
});

// Which keys are used to invalidate a cached session.
const LOGIN_CACHE_KEY_FIELDS = typesafeUnionMembers<
  keyof OmitStrict<SynologyLoginParameters, "otpCode">
>({
  baseUrl: true,
  account: true,
  passwd: true,
  session: true,
  deviceToken: true,
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
        | "missing-host-permission"
        | "timeout"
        | "internal-error"
        | "unknown";
    };

// Firefox rejects a port in a match pattern, so the origin has to be built without one.
async function hasHostPermission(baseUrl: string) {
  try {
    const { protocol, hostname } = new URL(baseUrl);
    return await browser.permissions.contains({ origins: [`${protocol}//${hostname}/*`] });
  } catch {
    // Never let a failure to answer the question become the answer.
    return true;
  }
}

export const ConnectionFailure = {
  is: (login: SynologyLoginParameters | ConnectionFailure): login is ConnectionFailure => {
    return (login as ConnectionFailure).type != null;
  },

  from: async (error: any, baseUrl?: string): Promise<ConnectionFailure> => {
    if (error instanceof BadResponseError && error.response.status === 400) {
      return { type: "probable-wrong-protocol" };
    } else if (error instanceof NetworkError) {
      // A host permission the user revoked rejects fetch exactly like an unreachable host does,
      // so without this check the UI blames their hostname for something they did on purpose.
      if (baseUrl != null && !(await hasHostPermission(baseUrl))) {
        return { type: "missing-host-permission" };
      } else {
        return { type: "probable-wrong-url-or-no-connection-or-cert-error" };
      }
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
        case "missing-host-permission":
        case "internal-error":
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

export type SynologyLoginResult = { sid: string } | LoginFailure;

export const SynologyLoginResult = {
  isLoggedIn: (auth: SynologyLoginResult) => "sid" in auth,
};

function toLoginResult(response: ClientRequestResult<AuthLoginResponse>): SynologyLoginResult {
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
    | { login: SynologyLoginParameters; promise: Promise<ClientRequestResult<AuthLoginResponse>> }
    | undefined;

  constructor(
    public getLogin: () => Promise<SynologyLoginParameters | ConnectionFailure>,
    private getStoredAuth: (
      login: SynologyLoginParameters,
    ) => Promise<SynologyLoginResult | undefined>,
    private onAuthChange: (
      login: SynologyLoginParameters,
      auth: SynologyLoginResult | undefined,
    ) => Promise<void>,
  ) {}

  private getInflightLoginPromise(login: SynologyLoginParameters) {
    if (
      this.inflightLogin != null &&
      SynologyLoginParameters.isEquivalent(this.inflightLogin.login, login)
    ) {
      return this.inflightLogin.promise;
    } else {
      return undefined;
    }
  }

  private maybeLogIn = async (
    login: SynologyLoginParameters,
    request?: BaseRequest,
  ): Promise<ClientRequestResult<AuthLoginResponse>> => {
    const inflight = this.getInflightLoginPromise(login);
    if (inflight != null) {
      return inflight;
    }

    const promise = (async () => {
      const { baseUrl, account, passwd, session, otpCode, deviceToken } = login;

      const attempt = (version: AuthLoginRequest["version"]) =>
        Auth.Login(baseUrl, {
          ...request,
          // Spelled out rather than spread, so that the camelCased two-step verification fields
          // can't leak into the query string under names DSM doesn't know.
          account,
          passwd,
          session,
          version,
          ...(version === 6 && (otpCode != null || deviceToken != null)
            ? {
                otp_code: otpCode,
                enable_device_token: "yes" as const,
                device_name: DEVICE_NAME,
                device_id: otpCode != null ? undefined : deviceToken,
              }
            : {}),
        });

      try {
        // Only version 6 can issue or accept a device token. Versions 2 and 3 accept a OTP, but we
        // need the token to be able to automatically re-authenticate on session expiration, so that
        // isn't enough.
        if (otpCode != null || deviceToken != null) {
          return await attempt(6);
        }

        // Otherwise start at 2, the lowest version that supports sid, to reach the oldest DSMs we
        // can, and fall back to 3 for DSM 7. We'd like to ask Info.Query which versions exist
        // instead, but DSM 7 erroneously reports that it supports version 2.
        const response = await attempt(2);
        return !response.success &&
          UNSUPPORTED_API_VERSION_ERROR_CODES.includes(response.error.code)
          ? await attempt(3)
          : response;
      } catch (e) {
        return await ConnectionFailure.from(e, baseUrl);
      }
    })();

    this.inflightLogin = { login, promise };
    const response = await promise;

    if (this.inflightLogin?.promise !== promise) {
      throw new Error("in-flight login superseded; this promise is no longer valid");
    }
    this.inflightLogin = undefined;

    const auth = toLoginResult(response);
    if (SynologyLoginResult.isLoggedIn(auth) || LoginFailure.requiresUserIntervention(auth)) {
      await this.onAuthChange(login, auth);
    }

    return response;
  };

  private clearAuth = async (login: SynologyLoginParameters) => {
    if (this.getInflightLoginPromise(login) != null) {
      this.inflightLogin = undefined;
    }
    await this.onAuthChange(login, undefined);
  };

  // Note that this method is a BEST EFFORT. It only logs out the session this client can see, and
  // the next non-logout call is guaranteed to attempt to log back in. The result is provided for
  // convenience and may not reflect the true state of the session by the time it resolves.
  private maybeLogOut = async (
    request?: BaseRequest,
  ): Promise<ClientRequestResult<{}> | "not-logged-in"> => {
    const login = await this.getLogin();
    if (ConnectionFailure.is(login)) {
      return login;
    }

    const inflight = this.getInflightLoginPromise(login);
    const lastKnownAuth = inflight == null ? await this.getStoredAuth(login) : undefined;

    // We can unconditionally clear the underlying storage because it is the consumer's
    // responsibility to ensure that multiple clients sharing storage are coordinated, if that is
    // desired.
    await this.clearAuth(login);

    if (inflight != null) {
      const response = await inflight;
      const abandoned = toLoginResult(response);
      if (SynologyLoginResult.isLoggedIn(abandoned)) {
        return Auth.Logout(login.baseUrl, {
          ...request,
          sid: abandoned.sid,
          session: login.session,
        });
      } else {
        return response;
      }
    } else if (lastKnownAuth == null) {
      return "not-logged-in" as const;
    } else if (SynologyLoginResult.isLoggedIn(lastKnownAuth)) {
      return await Auth.Logout(login.baseUrl, {
        ...request,
        sid: lastKnownAuth.sid,
        session: login.session,
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
      // Resolved once and threaded through the whole request: re-reading it partway would let a
      // change mid-flight clear auth that belongs to the new login.
      let login;
      try {
        login = await this.getLogin();
        if (ConnectionFailure.is(login)) {
          return login;
        }
      } catch {
        return { type: "internal-error" };
      }

      const baseUrl = login.baseUrl;

      try {
        // `await`s in this block aren't necessary to adhere to the type signature, but it changes
        // who's responsible for handling the errors. Currently, errors unhandled by lower levels
        // are bubbled up to this outermost `catch`.
        const auth =
          (await this.getStoredAuth(login)) ?? toLoginResult(await this.maybeLogIn(login));

        if (!SynologyLoginResult.isLoggedIn(auth)) {
          if (shouldRetryTransientFailures && !LoginFailure.requiresUserIntervention(auth)) {
            await this.clearAuth(login);
            return await wrappedFunction(options, false);
          } else {
            return auth;
          }
        }

        const response = await fn(baseUrl, auth.sid, options);

        if (
          !response.success &&
          shouldRetryTransientFailures &&
          STALE_SESSION_ERROR_CODES.includes(response.error.code)
        ) {
          await this.clearAuth(login);
          return await wrappedFunction(options, false);
        } else {
          return response;
        }
      } catch (e) {
        return await ConnectionFailure.from(e, baseUrl);
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
      let login;
      try {
        login = await this.getLogin();
        if (ConnectionFailure.is(login)) {
          return login;
        }
      } catch {
        return { type: "internal-error" };
      }

      const baseUrl = login.baseUrl;

      try {
        return await fn(baseUrl, options);
      } catch (e) {
        return await ConnectionFailure.from(e, baseUrl);
      }
    };
  }

  public Auth = {
    Login: async (request?: BaseRequest): Promise<ClientRequestResult<AuthLoginResponse>> => {
      const login = await this.getLogin();
      return ConnectionFailure.is(login) ? login : await this.maybeLogIn(login, request);
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

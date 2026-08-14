import { typesafeIsEqual } from "../../lang";
import { ConnectionIdentifiers, ConnectionSecrets, getHostUrl } from "../../state";

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

export interface LoginCacheKey {
  baseUrl: string;
  username: string;
  password: string;
  // n.b. this is specifically null to survive browser.storage round-trips.
  deviceToken: string | null;
  session: SessionName;
}

export const LoginCacheKey = {
  from: (login: SynologyLoginParameters): LoginCacheKey => ({
    baseUrl: login.baseUrl,
    username: login.username,
    password: login.password,
    deviceToken: login.deviceToken ?? null,
    session: login.session,
  }),
};

export interface SynologyLoginParameters {
  baseUrl: string;
  username: string;
  password: string;
  deviceToken: string | undefined;
  session: SessionName;
  otpCode: string | undefined;
}

export const SynologyLoginParameters = {
  fromConnection: (
    identifiers: ConnectionIdentifiers | undefined,
    secrets: ConnectionSecrets | undefined,
    otpCode?: string,
  ): SynologyLoginParameters | ConnectionFailure => {
    const baseUrl = identifiers != null ? getHostUrl(identifiers) : undefined;

    // A missing password is reported separately, and only when it is the only thing missing, because
    // it is the one thing the popup can collect on its own.
    if (baseUrl == null || !identifiers?.username) {
      return { type: "missing-config", which: "other" };
    } else if (!secrets?.password) {
      return { type: "missing-config", which: "password" };
    }

    return {
      baseUrl,
      username: identifiers.username,
      password: secrets.password,
      deviceToken: secrets.deviceToken,
      session: SessionName.DownloadStation,
      otpCode,
    };
  },
};

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
    { login: LoginCacheKey; promise: Promise<ClientRequestResult<AuthLoginResponse>> } | undefined;

  constructor(
    public getLoginParameters: () => Promise<SynologyLoginParameters | ConnectionFailure>,
    private getStoredAuth: (login: LoginCacheKey) => Promise<SynologyLoginResult | undefined>,
    private onAuthChange: (
      login: LoginCacheKey,
      auth: SynologyLoginResult | undefined,
    ) => Promise<void>,
  ) {}

  private getInflightLoginPromise(login: LoginCacheKey) {
    if (this.inflightLogin != null && typesafeIsEqual(this.inflightLogin.login, login)) {
      return this.inflightLogin.promise;
    } else {
      return undefined;
    }
  }

  private maybeLogIn = async (
    login: SynologyLoginParameters,
    request?: BaseRequest,
  ): Promise<ClientRequestResult<AuthLoginResponse>> => {
    const loginCacheKey = LoginCacheKey.from(login);

    const inflight = this.getInflightLoginPromise(loginCacheKey);
    if (inflight != null) {
      return inflight;
    }

    const promise = (async () => {
      const { baseUrl, username, password, deviceToken, session, otpCode } = login;

      const attempt = (version: AuthLoginRequest["version"]) =>
        Auth.Login(baseUrl, {
          ...request,
          // Spelled out rather than spread, so that the camelCased two-step verification fields
          // can't leak into the query string under names DSM doesn't know.
          account: username,
          passwd: password,
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

    this.inflightLogin = { login: loginCacheKey, promise };
    const response = await promise;

    if (this.inflightLogin?.promise !== promise) {
      throw new Error("in-flight login superseded; this promise is no longer valid");
    }
    this.inflightLogin = undefined;

    const auth = toLoginResult(response);
    if (SynologyLoginResult.isLoggedIn(auth) || LoginFailure.requiresUserIntervention(auth)) {
      await this.onAuthChange(loginCacheKey, auth);
    }

    return response;
  };

  private clearAuth = async (login: LoginCacheKey) => {
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
    const login = await this.getLoginParameters();
    if (ConnectionFailure.is(login)) {
      return login;
    }

    const loginCacheKey = LoginCacheKey.from(login);

    const inflight = this.getInflightLoginPromise(loginCacheKey);
    const lastKnownAuth = inflight == null ? await this.getStoredAuth(loginCacheKey) : undefined;

    // We can unconditionally clear the underlying storage because it is the consumer's
    // responsibility to ensure that multiple clients sharing storage are coordinated, if that is
    // desired.
    await this.clearAuth(loginCacheKey);

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
        login = await this.getLoginParameters();
        if (ConnectionFailure.is(login)) {
          return login;
        }
      } catch {
        return { type: "internal-error" };
      }

      const baseUrl = login.baseUrl;
      const loginCacheKey = LoginCacheKey.from(login);

      try {
        // `await`s in this block aren't necessary to adhere to the type signature, but it changes
        // who's responsible for handling the errors. Currently, errors unhandled by lower levels
        // are bubbled up to this outermost `catch`.
        const auth =
          (await this.getStoredAuth(loginCacheKey)) ?? toLoginResult(await this.maybeLogIn(login));

        if (!SynologyLoginResult.isLoggedIn(auth)) {
          if (shouldRetryTransientFailures && !LoginFailure.requiresUserIntervention(auth)) {
            await this.clearAuth(loginCacheKey);
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
          await this.clearAuth(loginCacheKey);
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
        login = await this.getLoginParameters();
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
      const login = await this.getLoginParameters();
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

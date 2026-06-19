import { RestApiResponse, BaseRequest, get, SessionName } from "./shared";

const CGI_NAME = "auth";
const API_NAME = "SYNO.API.Auth";

export interface AuthLoginRequest extends BaseRequest {
  account: string;
  passwd: string;
  session: SessionName;
  // 2 is the lowest version that actually provides an sid.
  // 3 is the lowest version that DSM 7 supports.
  // 6 is the lowest version that supports device tokens (enable_device_token / device_id),
  // which is how we remember a 2FA login so the user only types their code once.
  version: 2 | 3 | 6;
  // The 6-digit two-factor code. Only needed on the first login for a 2FA-enabled account
  // (or when the remembered device token is no longer accepted).
  otp_code?: string;
  // Ask DSM to issue a device token we can reuse to skip future OTP prompts.
  enable_device_token?: "yes" | "no";
  // A human-readable name shown in DSM's trusted-devices list.
  device_name?: string;
  // A previously-issued device token, presented instead of an OTP on later logins.
  device_id?: string;
}

export interface AuthLoginResponse {
  sid: string;
  // Present when enable_device_token=yes and login succeeded; persist and reuse as device_id.
  did?: string;
}

export interface AuthLogoutRequest extends BaseRequest {
  sid: string;
  session: SessionName;
}

function Login(
  baseUrl: string,
  options: AuthLoginRequest,
): Promise<RestApiResponse<AuthLoginResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    method: "login",
    format: "sid",
    meta: {
      apiGroup: "Auth",
    },
  });
}

function Logout(baseUrl: string, options: AuthLogoutRequest): Promise<RestApiResponse<{}>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: "logout",
    meta: {
      apiGroup: "Auth",
    },
  });
}

export const Auth = {
  API_NAME,
  Login,
  Logout,
};

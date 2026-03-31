import { RestApiResponse, BaseRequest, get, SessionName } from "./shared";

const API_NAME = "SYNO.API.Auth";

export const AUTH_ERROR_OTP_REQUIRED = 403;

export interface AuthLoginRequest extends BaseRequest {
  account: string;
  passwd: string;
  session: SessionName;
  version: 6;
  otp_code?: string;
}

export interface AuthLoginResponse {
  sid: string;
  synotoken: string;
}

export interface AuthLogoutRequest extends BaseRequest {
  sid: string;
  session: SessionName;
}

function Login(
  baseUrl: string,
  options: AuthLoginRequest,
): Promise<RestApiResponse<AuthLoginResponse>> {
  return get(baseUrl, {
    ...options,
    api: API_NAME,
    method: "login",
    format: "sid",
    enable_syno_token: "yes",
    meta: {
      apiGroup: "Auth",
    },
  });
}

function Logout(baseUrl: string, options: AuthLogoutRequest): Promise<RestApiResponse<{}>> {
  return get(baseUrl, {
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

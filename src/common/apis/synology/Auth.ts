import { BaseRequest, RestApiResponse, SessionName, get } from "./shared";

const CGI_NAME = "auth";
const API_NAME = "SYNO.API.Auth";

export interface AuthLoginRequest extends BaseRequest {
  account: string;
  passwd: string;
  session: SessionName;
  // 2 is the lowest version that actually provides an sid.
  // 3 is the lowest version that DSM 7 supports.
  // 6 is the lowest version that supports device tokens.
  version: 2 | 3 | 6;
  otp_code?: string;
  enable_device_token?: "yes" | "no";
  device_name?: string;
  device_id?: string;
}

export interface AuthLoginResponse {
  // "session ID"
  sid: string;
  // "device ID"
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

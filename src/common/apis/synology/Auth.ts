import { SynologyResponse, BaseRequest, get, SessionName } from "./shared";

const CGI_NAME = "auth" as const;
const API_NAME = "SYNO.API.Auth" as const;

export interface AuthLoginRequest extends BaseRequest {
  account: string;
  passwd: string;
  session: SessionName;
}

export interface AuthLoginResponse {
  sid: string;
}

export interface AuthLogoutRequest extends BaseRequest {
  sid: string;
  session: SessionName;
}

function Login(
  baseUrl: string,
  options: AuthLoginRequest,
): Promise<SynologyResponse<AuthLoginResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    method: "login",
    version: 2,
    format: "sid",
  });
}

function Logout(baseUrl: string, options: AuthLogoutRequest): Promise<SynologyResponse<{}>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: "logout",
  });
}

export const Auth = {
  API_NAME,
  Login,
  Logout,
};

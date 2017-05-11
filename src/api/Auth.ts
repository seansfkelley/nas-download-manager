import { SynologyResponse, get } from './shared';
import { SessionName } from './constants';

export interface AuthLoginRequest {
  account: string;
  passwd: string;
  session: SessionName;
}

export interface AuthLoginResponse {
  sid: string;
}

const CGI_NAME = 'auth';
const API_NAME = 'SYNO.API.Auth';

function Login(baseUrl: string, options: AuthLoginRequest): Promise<SynologyResponse<AuthLoginResponse>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 2,
    method: 'login',
    account: options.account,
    passwd: options.passwd,
    session: options.session,
    format: 'sid'
  });
}

export interface AuthLogoutRequest {
  session: SessionName;
}

function Logout(baseUrl: string, sid: string, options: AuthLogoutRequest): Promise<SynologyResponse<{}>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'logout',
    session: options.session,
    sid
  });
}

export const Auth = { Login, Logout };

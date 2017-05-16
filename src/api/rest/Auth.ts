import { SynologyResponse, get } from './shared';
import { AuthLoginRequest, AuthLoginResponse, AuthLogoutRequest } from './AuthTypes';

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

function Logout(baseUrl: string, sid: string, options: AuthLogoutRequest): Promise<SynologyResponse<{}>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'logout',
    session: options.session,
    sid
  });
}

export * from './AuthTypes';

export const Auth = {
  API_NAME: API_NAME as typeof API_NAME,
  Login,
  Logout
};

import { SynologyResponse, get } from './shared';
import { AuthLoginRequest, AuthLoginResponse, AuthLogoutRequest } from './AuthTypes';

const CGI_NAME = 'auth';
const API_NAME = 'SYNO.API.Auth';

function Login(baseUrl: string, options: AuthLoginRequest): Promise<SynologyResponse<AuthLoginResponse>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 2,
    method: 'login',
    format: 'sid'
  });
}

function Logout(baseUrl: string, options: AuthLogoutRequest): Promise<SynologyResponse<{}>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'logout',
  });
}

export * from './AuthTypes';

export const Auth = {
  API_NAME: API_NAME as typeof API_NAME,
  Login,
  Logout
};

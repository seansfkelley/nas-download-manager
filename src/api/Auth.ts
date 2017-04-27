import { stringify } from 'query-string';

import { SynologyResponse, get, BASE_URL, SESSION_NAME } from './shared';

export type LoginResult = SynologyResponse<{
  data: {
    sid: string;
  };
}>;

function Login(username: string, password: string): Promise<LoginResult> {
  return get(`${BASE_URL}/webapi/auth.cgi?${stringify({
    api: 'SYNO.API.Auth',
    version: 2,
    method: 'login',
    account: username,
    passwd: password,
    session: SESSION_NAME,
    format: 'sid'
  })}`);
}

export type LogoutResult = SynologyResponse<{}>;

function Logout(sid: string): Promise<LogoutResult> {
  return get(`${BASE_URL}/webapi/auth.cgi?${stringify({
    api: 'SYNO.API.Auth',
    version: 1,
    method: 'logout',
    session: SESSION_NAME,
    sid
  })}`);
}

export const Auth = { Login, Logout };

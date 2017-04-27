import { SynologyResponse, get, SESSION_NAME } from './shared';

export type LoginResult = SynologyResponse<{ sid: string; }>;

const CGI_NAME = 'auth';
const API_NAME = 'SYNO.API.Auth';

function Login(username: string, password: string): Promise<LoginResult> {
  return get(CGI_NAME, {
    api: API_NAME,
    version: 2,
    method: 'login',
    account: username,
    passwd: password,
    session: SESSION_NAME,
    format: 'sid'
  });
}

export type LogoutResult = SynologyResponse<{}>;

function Logout(sid: string): Promise<LogoutResult> {
  return get(CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'logout',
    session: SESSION_NAME,
    sid
  });
}

export const Auth = { Login, Logout };

import { SynologyResponse, get } from './shared';
import { SessionName } from './constants';

export type LoginResult = SynologyResponse<{ sid: string; }>;

const CGI_NAME = 'auth';
const API_NAME = 'SYNO.API.Auth';

function Login(options: { account: string; passwd: string; session: SessionName; }): Promise<LoginResult> {
  return get(CGI_NAME, {
    api: API_NAME,
    version: 2,
    method: 'login',
    account: options.account,
    passwd: options.passwd,
    session: options.session,
    format: 'sid'
  });
}

export type LogoutResult = SynologyResponse<{}>;

function Logout(sid: string, options: { session: SessionName }): Promise<LogoutResult> {
  return get(CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'logout',
    session: options.session,
    sid
  });
}

export const Auth = { Login, Logout };

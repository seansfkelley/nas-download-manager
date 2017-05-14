import { SessionName } from './constants';

export interface AuthLoginRequest {
  account: string;
  passwd: string;
  session: SessionName;
}

export interface AuthLoginResponse {
  sid: string;
}

export interface AuthLogoutRequest {
  session: SessionName;
}

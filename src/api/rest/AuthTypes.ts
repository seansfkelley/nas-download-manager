import { SessionName } from './constants';
import { BaseRequest } from './shared';

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

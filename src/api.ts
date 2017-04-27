import Axios from 'axios';
import { stringify } from 'query-string';

import { PROTOCOL, HOSTNAME, PORT } from './secrets';

const BASE_URL = `${PROTOCOL}://${HOSTNAME}:${PORT}`;

export type LoginResult = {
  success: true;
  data: {
    sid: string;
  };
} | {
  success: false;
  error: {
    code: number;
  };
}

export function login(username: string, password: string): Promise<LoginResult> {
  return Axios({
    url: `${BASE_URL}/webapi/auth.cgi?${stringify({
      api: 'SYNO.API.Auth',
      version: 2,
      method: 'login',
      account: username,
      passwd: password,
      session: 'DownloadStation', // TODO: Configurable?
      format: 'sid'
    })}`
  })
    .then(response => response.data);
}

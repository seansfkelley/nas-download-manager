import { stringify } from 'query-string';

import { SynologyResponse, get, BASE_URL, SESSION_NAME } from './shared';

export type GetInfoResult = SynologyResponse<{
  is_manager: boolean;
  version: number;
  version_string: string;
}>;

function GetInfo(sid: string): Promise<GetInfoResult> {
  return get(`${BASE_URL}/webapi/DownloadStation/info.cgi?${stringify({
    api: 'SYNO.DownloadStation.Info',
    version: 1,
    method: 'getinfo',
    session: SESSION_NAME,
    sid
  })}`);
}

export type GetConfigResult = SynologyResponse<{}>;

function GetConfig(sid: string): Promise<GetConfigResult> {
  return get(`${BASE_URL}/webapi/DownloadStation/info.cgi?${stringify({
    api: 'SYNO.DownloadStation.Info',
    version: 1,
    method: 'getconfig',
    session: SESSION_NAME,
    sid
  })}`);
}

export const DownloadStation = {
  Info: {
    GetInfo,
    GetConfig
  }
};

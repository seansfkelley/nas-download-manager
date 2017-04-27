import { stringify } from 'query-string';

import { SynologyResponse, get, BASE_URL } from './shared';

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
    _sid: sid
  })}`);
}

export type GetConfigResult = SynologyResponse<{}>;

function GetConfig(sid: string): Promise<GetConfigResult> {
  return get(`${BASE_URL}/webapi/DownloadStation/info.cgi?${stringify({
    api: 'SYNO.DownloadStation.Info',
    version: 1,
    method: 'getconfig',
    _sid: sid
  })}`);
}

export type ListResult = SynologyResponse<{}>;

function List(sid: string, additional: ('detail' | 'transfer' | 'file' | 'tracker' | 'peer')[] = []): Promise<ListResult> {
  return get(`${BASE_URL}/webapi/DownloadStation/task.cgi?${stringify({
    api: 'SYNO.DownloadStation.Task',
    version: 1,
    method: 'list',
    additional: additional.join(','),
    _sid: sid
  })}`);
}

export const DownloadStation = {
  Info: {
    GetInfo,
    GetConfig
  },
  Task: {
    List
  }
};

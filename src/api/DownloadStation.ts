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

export interface DownloadStationConfig {
  bt_max_download: number;
  bt_max_upload: number;
  emule_max_download: number;
  emule_max_upload: number;
  nzb_max_download: number;
  http_max_download: number;
  ftp_max_download: number;
  emule_enabled: boolean;
  unzip_service_enabled: number;
  default_destination: string;
  emule_default_destination: string;
};

export type GetConfigResult = SynologyResponse<DownloadStationConfig>;

function GetConfig(sid: string): Promise<GetConfigResult> {
  return get(`${BASE_URL}/webapi/DownloadStation/info.cgi?${stringify({
    api: 'SYNO.DownloadStation.Info',
    version: 1,
    method: 'getconfig',
    _sid: sid
  })}`);
}

export type SetServerConfigResult = SynologyResponse<{}>;

// Note that, if you aren't a user allowed to do this, it will return successfully without performing any changes.
function SetServerConfig(sid: string, config: Partial<DownloadStationConfig>): Promise<SetServerConfigResult> {
  // Yeah, not POST...
  return get(`${BASE_URL}/webapi/DownloadStation/info.cgi?${stringify({
    api: 'SYNO.DownloadStation.Info',
    version: 1,
    method: 'setserverconfig',
    _sid: sid,
    ...config
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
    GetConfig,
    SetServerConfig
  },
  Task: {
    List
  }
};

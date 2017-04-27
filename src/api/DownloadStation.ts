import { stringify } from 'query-string';

import { SynologyResponse, get, BASE_URL } from './shared';

function Info_GetInfo(sid: string): Promise<SynologyResponse<{
  is_manager: boolean;
  version: number;
  version_string: string;
}>> {
  return get(`${BASE_URL}/webapi/DownloadStation/info.cgi?${stringify({
    api: 'SYNO.DownloadStation.Info',
    version: 1,
    method: 'getinfo',
    _sid: sid
  })}`);
}

export interface DownloadStationInfoConfig {
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

function Info_GetConfig(sid: string): Promise<SynologyResponse<DownloadStationInfoConfig>> {
  return get(`${BASE_URL}/webapi/DownloadStation/info.cgi?${stringify({
    api: 'SYNO.DownloadStation.Info',
    version: 1,
    method: 'getconfig',
    _sid: sid
  })}`);
}

// Note that, if you aren't a user allowed to do this, it will return successfully without performing any changes.
function Info_SetServerConfig(sid: string, config: Partial<DownloadStationInfoConfig>): Promise<SynologyResponse<{}>> {
  // Yeah, not POST...
  return get(`${BASE_URL}/webapi/DownloadStation/info.cgi?${stringify({
    api: 'SYNO.DownloadStation.Info',
    version: 1,
    method: 'setserverconfig',
    _sid: sid,
    ...config
  })}`);
}

export interface DownloadStationScheduleConfig {
  enabled: boolean;
  emule_enabled: boolean;
}

function Schedule_GetConfig(sid: string): Promise<SynologyResponse<DownloadStationScheduleConfig>> {
  return get(`${BASE_URL}/webapi/DownloadStation/schedule.cgi?${stringify({
    api: 'SYNO.DownloadStation.Schedule',
    version: 1,
    method: 'getconfig',
    _sid: sid
  })}`);
}

function Schedule_SetConfig(sid: string, config: Partial<DownloadStationScheduleConfig>): Promise<SynologyResponse<{}>> {
  return get(`${BASE_URL}/webapi/DownloadStation/schedule.cgi?${stringify({
    api: 'SYNO.DownloadStation.Schedule',
    version: 1,
    method: 'setconfig',
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
    GetInfo: Info_GetInfo,
    GetConfig: Info_GetConfig,
    SetServerConfig: Info_SetServerConfig
  },
  Schedule: {
    GetConfig: Schedule_GetConfig,
    SetConfig: Schedule_SetConfig
  },
  Task: {
    List
  }
};

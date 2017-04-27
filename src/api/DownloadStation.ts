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

export type Task_ListResult = SynologyResponse<{}>;

export interface DownloadStationTaskListRequest {
  offset?: number;
  limit?: number;
  additional?: ('detail' | 'transfer' | 'file' | 'tracker' | 'peer')[];
}

export interface DownloadStationTaskListResponse {
  // total is the number of results that came back, NOT the total number that exist on the remote.
  total: number;
  offset: number;
  tasks: DownloadStationTask[];
}

export interface DownloadStationTaskDetail {
  completed_time: number;
  connected_leechers: number;
  connected_peers: number;
  connected_seeders: number;
  create_time: number;
  destination: string;
  seedelapsed: number;
  started_time: number;
  total_peers: number;
  total_pieces: number;
  unzip_password: string;
  uri: string;
  waiting_seconds: number;
}

export interface DownloadStationTaskFile {
  filename: string;
  index: number;
  priority: 'low' | 'normal' | 'high';
  size: number;
  size_downloaded: number;
  wanted: boolean;
}

export interface DownloadStationTaskPeer {
  // ???
}

export interface DownloadStationTaskTracker {
  peers: number;
  seeds: number;
  status: string;
  update_time: number;
  url: string;
}

export interface DownloadStationTaskTransfer {
  downloaded_pieces: number;
  size_downloaded: number;
  size_uploaded: number;
  speed_download: number;
  speed_upload: number;
}

export interface DownloadStationTask {
  id: string;
  type: string;
  username: string;
  title: string;
  size: number;
  status: string;
  status_extra?: string;
  // It's unclear to me if the values of these keys are a function of the type of task.
  // I also don't know what the optionality of these are -- it's not documented, so this is
  // guesswork from experimental results.
  additional?: {
    detail?: DownloadStationTaskDetail;
    file?: DownloadStationTaskFile[];
    peer?: DownloadStationTaskPeer[];
    tracker?: DownloadStationTaskTracker[];
    transfer?: DownloadStationTaskTransfer;
  };
}

function Task_List(sid: string, options?: DownloadStationTaskListRequest): Promise<any> {
  return get(`${BASE_URL}/webapi/DownloadStation/task.cgi?${stringify({
    api: 'SYNO.DownloadStation.Task',
    version: 1,
    method: 'list',
    _sid: sid,
    ...options,
    additional: options && options.additional && options.additional.length ? options.additional.join(',') : undefined
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
    List: Task_List
  }
};

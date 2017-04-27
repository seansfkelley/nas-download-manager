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

export type DownloadStationTaskAdditionalType = 'detail' | 'transfer' | 'file' | 'tracker' | 'peer';

export interface DownloadStationTaskListRequest {
  offset?: number;
  limit?: number;
  additional?: DownloadStationTaskAdditionalType[];
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
  priority: 'skip' | 'low' | 'normal' | 'high';
  size: number;
  size_downloaded: number;
  wanted: boolean;
}

export interface DownloadStationTaskPeer {
  address: string;
  agent: string;
  progress: number;
  speed_download: number;
  speed_upload: string;
}

export interface DownloadStationTaskTracker {
  peers: number;
  seeds: number;
  status: string;
  update_timer: number;
  url: string;
}

export interface DownloadStationTaskTransfer {
  downloaded_pieces: number;
  size_downloaded: number;
  size_uploaded: number;
  speed_download: number;
  speed_upload: number;
}

export type DownloadStationTaskNormalStatus =
  'downloading' |
  'error' |
  'extracting' |
  'filehosting_waiting' |
  'finished' |
  'finishing' |
  'hash_checking' |
  'paused' |
  'seeding' |
  'waiting';

export type DownloadStationTaskErrorStatus =
  'broken_link' |
  'destination_denied' |
  'destination_not_exist' |
  'disk_full' |
  'encrypted_name_too_long' |
  'exceed_max_destination_size' |
  'exceed_max_file_system_size' |
  'exceed_max_temp_size' |
  'extract_failed_disk_full' |
  'extract_failed_invalid_archive' |
  'extract_failed_quota_reached ' |
  'extract_failed_wrong_password' |
  'extract_failed' |
  'file_not_exist' |
  'ftp_encryption_not_supported_type' |
  'missing_python' |
  'name_too_long' |
  'not_supported_type' |
  'private_video' |
  'quota_reached' |
  'required_premium_account' |
  'task_encryption' |
  'timeout' |
  'torrent_duplicate' |
  'try_it_later' |
  'unknown';

export interface DownloadStationTask {
  id: string;
  // The docs have these properly cased, but I'm pretty sure they all end up on the wire lowercased.
  type: 'bt' | 'nzb' | 'http' | 'ftp' | 'emule';
  username: string;
  title: string;
  size: number;
  // Can this be ErrorStatus, or will it just be error, with ErrorStatus specified in status_extra?
  status: DownloadStationTaskNormalStatus | DownloadStationTaskErrorStatus;
  status_extra?: {
    error_detail: DownloadStationTaskErrorStatus;
    unzip_progress?: number;
  };
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

function Task_List(sid: string, options?: DownloadStationTaskListRequest): Promise<SynologyResponse<DownloadStationTaskListResponse>> {
  return get(`${BASE_URL}/webapi/DownloadStation/task.cgi?${stringify({
    api: 'SYNO.DownloadStation.Task',
    version: 1,
    method: 'list',
    _sid: sid,
    ...options,
    additional: options && options.additional && options.additional.length ? options.additional.join(',') : undefined
  })}`);
}

export interface DownloadStationTaskGetInfoRequest {
  id: string[];
  additional?: DownloadStationTaskAdditionalType[];
}

export interface DownloadStationTaskGetInfoResponse {
  tasks: DownloadStationTask[];
}

function Task_GetInfo(sid: string, options: DownloadStationTaskGetInfoRequest): Promise<SynologyResponse<DownloadStationTaskGetInfoResponse>> {
  return get(`${BASE_URL}/webapi/DownloadStation/task.cgi?${stringify({
    api: 'SYNO.DownloadStation.Task',
    version: 1,
    method: 'getinfo',
    _sid: sid,
    ...options,
    id: options.id.join(','),
    additional: options.additional && options.additional.length ? options.additional.join(',') : undefined
  })}`);
}

export interface DownloadStationTaskCreateRequest {
  uri?: string[];
  file?: string;
  username?: string;
  password?: string;
  unzip_password?: string;
  destination?: string;
}

function Task_Create(sid: string, options: DownloadStationTaskCreateRequest): Promise<SynologyResponse<{}>> {
  if (options.file) {
    // This requires some nontrivial noodlery with POST and bodies and stuff that I don't yet care about,
    // so leave it for later.
    throw new Error(`Unimplemented behavior: cannot send file data to Task.Create!`);
  }

  return get(`${BASE_URL}/webapi/DownloadStation/task.cgi?${stringify({
    api: 'SYNO.DownloadStation.Task',
    version: 1,
    method: 'create',
    _sid: sid,
    ...options,
    uri: options.uri && options.uri.length ? options.uri.join(',') : undefined
  })}`);
}

export interface DownloadStationTaskDeleteRequest {
  id: string[];
  force_complete: boolean;
}

export type DownloadStationTaskActionResponse = {
  id: string;
  error: number; // 0 = success. Cool API bro.
}[];

function Task_Delete(sid: string, options: DownloadStationTaskDeleteRequest): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(`${BASE_URL}/webapi/DownloadStation/task.cgi?${stringify({
    api: 'SYNO.DownloadStation.Task',
    version: 1,
    method: 'delete',
    _sid: sid,
    ...options,
    id: options.id.length ? options.id.join(',') : undefined
  })}`);
}

function Task_Pause(sid: string, options: { id: string[]; }): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(`${BASE_URL}/webapi/DownloadStation/task.cgi?${stringify({
    api: 'SYNO.DownloadStation.Task',
    version: 1,
    method: 'pause',
    _sid: sid,
    ...options,
    id: options.id.length ? options.id.join(',') : undefined
  })}`);
}

function Task_Resume(sid: string, options: { id: string[]; }): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(`${BASE_URL}/webapi/DownloadStation/task.cgi?${stringify({
    api: 'SYNO.DownloadStation.Task',
    version: 1,
    method: 'resume',
    _sid: sid,
    ...options,
    id: options.id.length ? options.id.join(',') : undefined
  })}`);
}

function Task_Edit(sid: string, options: { id: string[]; destination?: string; }): Promise<SynologyResponse<DownloadStationTaskActionResponse>> {
  return get(`${BASE_URL}/webapi/DownloadStation/task.cgi?${stringify({
    api: 'SYNO.DownloadStation.Task',
    version: 1,
    method: 'edit',
    _sid: sid,
    ...options,
    id: options.id.length ? options.id.join(',') : undefined
  })}`);
}

export interface DownloadStationStatisticGetInfoResponse {
  speed_download: number;
  speed_upload: number;
  emule_speed_download?: number;
  emule_speed_upload?: number;
}

function Statistic_GetInfo(sid: string): Promise<SynologyResponse<DownloadStationStatisticGetInfoResponse>> {
  return get(`${BASE_URL}/webapi/DownloadStation/statistic.cgi?${stringify({
    api: 'SYNO.DownloadStation.Statistic',
    version: 1,
    method: 'getinfo',
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
    List: Task_List,
    GetInfo: Task_GetInfo,
    Create: Task_Create,
    Delete: Task_Delete,
    Pause: Task_Pause,
    Resume: Task_Resume,
    Edit: Task_Edit
  },
  Statistic: {
    GetInfo: Statistic_GetInfo
  }
};

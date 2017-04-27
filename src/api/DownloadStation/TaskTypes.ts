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
  'encryption' |
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

export interface DownloadStationTaskGetInfoRequest {
  id: string[];
  additional?: DownloadStationTaskAdditionalType[];
}

export interface DownloadStationTaskGetInfoResponse {
  tasks: DownloadStationTask[];
}

export interface DownloadStationTaskCreateRequest {
  uri?: string[];
  file?: string;
  username?: string;
  password?: string;
  unzip_password?: string;
  destination?: string;
}

export interface DownloadStationTaskDeleteRequest {
  id: string[];
  force_complete: boolean;
}

export type DownloadStationTaskActionResponse = {
  id: string;
  error: number; // 0 = success. Cool API bro.
}[];

export interface DownloadStationInfoGetInfoResponse {
  is_manager: boolean;
  version: number;
  version_string: string;
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

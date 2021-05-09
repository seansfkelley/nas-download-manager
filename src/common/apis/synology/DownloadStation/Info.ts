import { ApiBuilder, BaseRequest } from "../shared";

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
  unzip_service_enabled: boolean;
  default_destination: string;
  emule_default_destination: string;
}

const API_NAME = "SYNO.DownloadStation.Info";
const infoBuilder = new ApiBuilder("DownloadStation/info", API_NAME, {
  apiGroup: "DownloadStation",
  apiSubgroup: "DownloadStation.Info",
});

export const Info = {
  API_NAME,
  GetInfo: infoBuilder.makeGet<BaseRequest, DownloadStationInfoGetInfoResponse>(
    "getinfo",
    undefined,
    undefined,
    true,
  ),
  GetConfig: infoBuilder.makeGet<BaseRequest, DownloadStationInfoConfig>(
    "getconfig",
    undefined,
    undefined,
    true,
  ),
  SetServerConfig: infoBuilder.makeGet<Partial<DownloadStationInfoConfig> & BaseRequest, {}>(
    "setserverconfig",
  ),
};

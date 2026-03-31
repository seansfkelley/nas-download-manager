import { ApiBuilder, BaseRequest } from "../shared";

export interface DownloadStationGlobalSettings {
  download_volume: string;
  enable_emule: boolean;
  enable_unzip_service: boolean;
  volume_count: number;
  volume_list: {
    desc: string;
    display: string;
    mount_point: string;
    size_free: string;
    size_total: string;
    value: string;
    vol_desc: string;
  }[];
}

const API_NAME = "SYNO.DownloadStation2.Settings.Global";
const infoBuilder = new ApiBuilder(
  API_NAME,
  {
    apiGroup: "DownloadStation2",
    apiSubgroup: "DownloadStation2.Settings.Global",
  },
  2,
);

export const Info = {
  API_NAME,
  GetConfig: infoBuilder.makeGet<BaseRequest, DownloadStationGlobalSettings>(
    "get",
    undefined,
    undefined,
    true,
  ),
};

import { ApiBuilder, BaseRequest } from "../shared";

export interface FileStationInfoGetResponse {
  is_manager: boolean;
  support_virtual_protocol: number;
  support_sharing: boolean;
  hostname: string;
}

const API_NAME = "SYNO.FileStation.Info";
const infoBuilder = new ApiBuilder("entry", API_NAME, {
  apiGroup: "FileStation",
  apiSubgroup: "FileStation.Info",
});

export const Info = {
  API_NAME,
  get: infoBuilder.makeGet<BaseRequest, FileStationInfoGetResponse>("get"),
};

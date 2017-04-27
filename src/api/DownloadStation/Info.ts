import { SynologyResponse, get } from '../shared';
import { DownloadStationInfoConfig, DownloadStationInfoGetInfoResponse } from './InfoTypes';

const CGI_NAME = `DownloadStation/info`;
const API_NAME = 'SYNO.DownloadStation.Info';

function GetInfo(sid: string): Promise<SynologyResponse<DownloadStationInfoGetInfoResponse>> {
  return get(CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'getinfo',
    sid
  });
}

function GetConfig(sid: string): Promise<SynologyResponse<DownloadStationInfoConfig>> {
  return get(CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'getconfig',
    sid
  });
}

// Note that, if you aren't a user allowed to do this, it will return successfully without performing any changes.
function SetServerConfig(sid: string, config: Partial<DownloadStationInfoConfig>): Promise<SynologyResponse<{}>> {
  return get(CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'setserverconfig',
    sid,
    ...config
  });
}

export const Info = {
  GetInfo,
  GetConfig,
  SetServerConfig
};

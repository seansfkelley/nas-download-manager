import { SynologyResponse, get } from '../shared';
import { DownloadStationInfoConfig, DownloadStationInfoGetInfoResponse } from './InfoTypes';

const CGI_NAME = `DownloadStation/info`;
const API_NAME = 'SYNO.DownloadStation.Info';

function GetInfo(baseUrl: string, sid: string): Promise<SynologyResponse<DownloadStationInfoGetInfoResponse>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'getinfo',
    sid
  });
}

function GetConfig(baseUrl: string, sid: string): Promise<SynologyResponse<DownloadStationInfoConfig>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'getconfig',
    sid
  });
}

// Note that, if you aren't a user allowed to do this, it will return successfully without performing any changes.
function SetServerConfig(baseUrl: string, sid: string, config: Partial<DownloadStationInfoConfig>): Promise<SynologyResponse<{}>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'setserverconfig',
    sid,
    ...config
  });
}

export const Info = {
  API_NAME: API_NAME as typeof API_NAME,
  GetInfo,
  GetConfig,
  SetServerConfig
};

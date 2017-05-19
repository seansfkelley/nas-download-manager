import { SynologyResponse, get } from '../shared';
import { BaseRequest } from '../shared';
import { DownloadStationScheduleConfig } from './ScheduleTypes';

const CGI_NAME = `DownloadStation/schedule`;
const API_NAME = 'SYNO.DownloadStation.Schedule';

function GetConfig(baseUrl: string, sid: string, options: BaseRequest = {}): Promise<SynologyResponse<DownloadStationScheduleConfig>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'getconfig',
    sid
  });
}

function SetConfig(baseUrl: string, sid: string, options: Partial<DownloadStationScheduleConfig & BaseRequest>): Promise<SynologyResponse<{}>> {
  return get(baseUrl, CGI_NAME, {
    ...options,
    api: API_NAME,
    version: 1,
    method: 'setconfig',
    sid
  });
}

export const Schedule = {
  API_NAME: API_NAME as typeof API_NAME,
  GetConfig,
  SetConfig
};

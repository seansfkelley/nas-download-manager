import { SynologyResponse, get } from '../shared';
import { DownloadStationScheduleConfig } from './ScheduleTypes';

const CGI_NAME = `DownloadStation/schedule`;
const API_NAME = 'SYNO.DownloadStation.Schedule';

function GetConfig(sid: string): Promise<SynologyResponse<DownloadStationScheduleConfig>> {
  return get(CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'getconfig',
    sid
  });
}

function SetConfig(sid: string, config: Partial<DownloadStationScheduleConfig>): Promise<SynologyResponse<{}>> {
  return get(CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'setconfig',
    sid,
    ...config
  });
}

export const Schedule = {
  GetConfig,
  SetConfig
};

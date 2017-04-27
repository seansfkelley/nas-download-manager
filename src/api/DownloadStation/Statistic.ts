import { SynologyResponse, get } from '../shared';
import { DownloadStationStatisticGetInfoResponse } from './StatisticTypes';

const CGI_NAME = 'DownloadStation/statistic';
const API_NAME = 'SYNO.DownloadStation.Statistic';

function GetInfo(sid: string): Promise<SynologyResponse<DownloadStationStatisticGetInfoResponse>> {
  return get(CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'getinfo',
    sid
  });
}

export const Statistic = {
  GetInfo
};

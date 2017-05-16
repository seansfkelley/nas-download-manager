import { SynologyResponse, get } from '../shared';
import { DownloadStationStatisticGetInfoResponse } from './StatisticTypes';

const CGI_NAME = 'DownloadStation/statistic';
const API_NAME = 'SYNO.DownloadStation.Statistic';

function GetInfo(baseUrl: string, sid: string): Promise<SynologyResponse<DownloadStationStatisticGetInfoResponse>> {
  return get(baseUrl, CGI_NAME, {
    api: API_NAME,
    version: 1,
    method: 'getinfo',
    sid
  });
}

export const Statistic = {
  API_NAME: API_NAME as typeof API_NAME,
  GetInfo
};

export * from './InfoTypes';
export * from './ScheduleTypes';
export * from './StatisticTypes';
export * from './TaskTypes';

import { Info } from './Info';
import { Schedule } from './Schedule';
import { Statistic } from './Statistic';
import { Task } from './Task';

export const DownloadStation = {
  Info,
  Schedule,
  Statistic,
  Task
};

// And, to make the compiler shut up about export naming...

import {
  DownloadStationInfoConfig,
  DownloadStationInfoGetInfoResponse
} from './InfoTypes';

import {
  DownloadStationTaskActionResponse,
  DownloadStationTaskCreateRequest,
  DownloadStationTaskDeleteRequest,
  DownloadStationTaskGetInfoRequest,
  DownloadStationTaskGetInfoResponse,
  DownloadStationTaskListRequest,
  DownloadStationTaskListResponse
} from './TaskTypes';

import {
  DownloadStationScheduleConfig
} from './ScheduleTypes';

import {
  DownloadStationStatisticGetInfoResponse
} from './StatisticTypes';

{
  // Good god, shut up about unused imports! You're the one that demanded I needed these names available!
  let _1: DownloadStationInfoConfig & DownloadStationInfoGetInfoResponse & DownloadStationTaskActionResponse & DownloadStationTaskCreateRequest & DownloadStationTaskDeleteRequest & DownloadStationTaskGetInfoRequest & DownloadStationTaskGetInfoResponse & DownloadStationTaskListRequest & DownloadStationTaskListResponse & DownloadStationScheduleConfig & DownloadStationStatisticGetInfoResponse = null as any; _1;
}

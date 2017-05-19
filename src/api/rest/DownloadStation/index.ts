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

import { BaseRequest } from '../shared';
import * as _infoTypes from './InfoTypes';
import * as _taskTypes from './TaskTypes';
import * as _scheduleTypes from './ScheduleTypes';
import * as _statisticTypes from './StatisticTypes';

// And and, to make the compiler shut up about unused locals (I mean seriously?! This compiler wants to eat its cake and have it too.)

{
  let _unused: BaseRequest = null as any; _unused;
  _infoTypes;
  _taskTypes;
  _scheduleTypes;
  _statisticTypes;
}

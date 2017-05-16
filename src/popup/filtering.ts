import { DownloadStationTask, DownloadStationTaskNormalStatus, DownloadStationTaskErrorStatus, ALL_TASK_ERROR_STATUSES, ALL_TASK_NORMAL_STATUSES } from '../api';
import { VisibleTaskSettings } from '../common';

const EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES: { [K in keyof VisibleTaskSettings]?: DownloadStationTaskNormalStatus[] } = {
  downloading: [ 'downloading', 'extracting', 'finishing', 'hash_checking' ],
  uploading: [ 'seeding' ],
  completed: [ 'finished' ]
};

const EXPLICITLY_SPECIFIED_TYPES = (Object.keys(EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES) as (keyof VisibleTaskSettings)[])
    .reduce((acc, key) => acc.concat(EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES[key]!), [] as DownloadStationTaskNormalStatus[]);

const ERRORED_TYPES = (ALL_TASK_ERROR_STATUSES as (DownloadStationTaskNormalStatus | DownloadStationTaskErrorStatus)[])
  .concat([ 'error' ]);

const OTHER_STATUSES = ALL_TASK_NORMAL_STATUSES
  .filter(status => EXPLICITLY_SPECIFIED_TYPES.indexOf(status) === -1 && ERRORED_TYPES.indexOf(status) === -1);

const TASK_FILTER_TO_TYPES: { [K in keyof VisibleTaskSettings]: (DownloadStationTaskNormalStatus | DownloadStationTaskErrorStatus)[] } = {
  downloading: [],
  uploading: [],
  completed: [],
  ...EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES,
  errored: ERRORED_TYPES,
  other: OTHER_STATUSES
};

export function matchesFilter(task: DownloadStationTask, filterName: keyof VisibleTaskSettings) {
  return TASK_FILTER_TO_TYPES[filterName].indexOf(task.status) !== -1;
}

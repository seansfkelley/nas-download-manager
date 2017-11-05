import { sortBy } from 'lodash-es';
import { DownloadStationTask, DownloadStationTaskNormalStatus, DownloadStationTaskErrorStatus, ALL_TASK_ERROR_STATUSES, ALL_TASK_NORMAL_STATUSES } from 'synology-typescript-api';
import { VisibleTaskSettings, TaskSortType } from '../common/state';
import { assertNever } from '../common/lang';

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

const TASK_FILTER_TO_TYPES: Record<keyof VisibleTaskSettings, (DownloadStationTaskNormalStatus | DownloadStationTaskErrorStatus)[]> = {
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

function createSortFunction(taskSortType: TaskSortType) {
  return (task: DownloadStationTask) => {
    switch (taskSortType) {
      case 'name-asc':
      case 'name-desc':
        return task.title.toLocaleLowerCase();

      case 'timestamp-completed-asc':
      case 'timestamp-completed-desc':
        if (matchesFilter(task, 'completed')) {
          return task.additional!.detail!.completed_time;
        } else {
          return task.additional!.transfer!.size_downloaded / task.size;
        }

      case 'timestamp-added-asc':
      case 'timestamp-added-desc':
        return task.additional!.detail!.started_time;

      case 'completed-percent-asc':
      case 'completed-percent-desc':
        return task.additional!.transfer!.size_downloaded / task.size;

      default:
        return assertNever(taskSortType);
    }
  };
}

const SHOULD_REVERSE_SORT: Record<TaskSortType, boolean> = {
  'name-asc': false,
  'name-desc': true,
  'timestamp-completed-asc': false,
  'timestamp-completed-desc': true,
  'timestamp-added-asc': false,
  'timestamp-added-desc': true,
  'completed-percent-asc': false,
  'completed-percent-desc': true,
};

export function sortTasks(tasks: DownloadStationTask[], taskSortType: TaskSortType) {
  const sorted = sortBy(tasks, createSortFunction(taskSortType));
  return SHOULD_REVERSE_SORT[taskSortType] ? sorted.reverse() : sorted;
}

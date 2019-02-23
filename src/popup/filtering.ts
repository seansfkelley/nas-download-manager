import sortBy from "lodash-es/sortBy";
import {
  DownloadStationTask,
  DownloadStationTaskNormalStatus,
  DownloadStationTaskErrorStatus,
  ALL_TASK_ERROR_STATUSES,
  ALL_TASK_NORMAL_STATUSES,
} from "synology-typescript-api";
import { VisibleTaskSettings, TaskSortType } from "../common/state";
import { assertNever } from "../common/lang";

const EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES: {
  [K in keyof VisibleTaskSettings]?: DownloadStationTaskNormalStatus[]
} = {
  downloading: ["downloading", "extracting", "finishing", "hash_checking"],
  uploading: ["seeding"],
  completed: ["finished"],
};

const EXPLICITLY_SPECIFIED_TYPES = (Object.keys(
  EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES,
) as (keyof VisibleTaskSettings)[]).reduce(
  (acc, key) => acc.concat(EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES[key]!),
  [] as DownloadStationTaskNormalStatus[],
);

const ERRORED_TYPES = (ALL_TASK_ERROR_STATUSES as (
  | DownloadStationTaskNormalStatus
  | DownloadStationTaskErrorStatus)[]).concat(["error"]);

const OTHER_STATUSES = ALL_TASK_NORMAL_STATUSES.filter(
  status =>
    EXPLICITLY_SPECIFIED_TYPES.indexOf(status) === -1 && ERRORED_TYPES.indexOf(status) === -1,
);

const TASK_FILTER_TO_TYPES: Record<
  keyof VisibleTaskSettings,
  (DownloadStationTaskNormalStatus | DownloadStationTaskErrorStatus)[]
> = {
  downloading: [],
  uploading: [],
  completed: [],
  ...EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES,
  errored: ERRORED_TYPES,
  other: OTHER_STATUSES,
};

export function matchesFilter(task: DownloadStationTask, filterName: keyof VisibleTaskSettings) {
  return TASK_FILTER_TO_TYPES[filterName].indexOf(task.status) !== -1;
}

function fractionComplete(task: DownloadStationTask) {
  return task.additional!.transfer!.size_downloaded / task.size;
}

export function sortTasks(
  tasks: DownloadStationTask[],
  taskSortType: TaskSortType,
): DownloadStationTask[] {
  switch (taskSortType) {
    case "name-asc":
      return sortBy(tasks, t => t.title.toLocaleLowerCase());

    case "name-desc":
      return sortBy(tasks, t => t.title.toLocaleLowerCase()).reverse();

    case "timestamp-completed-asc":
      return sortBy(tasks, t => {
        if (matchesFilter(t, "completed")) {
          return t.additional!.detail!.completed_time;
        } else {
          return fractionComplete(t);
        }
      });

    case "timestamp-completed-desc":
      return sortBy(tasks, t => {
        if (matchesFilter(t, "completed")) {
          return -t.additional!.detail!.completed_time;
        } else {
          return 1 - fractionComplete(t);
        }
      }).reverse();

    case "timestamp-added-asc":
      return sortBy(tasks, t => t.additional!.detail!.create_time);

    case "timestamp-added-desc":
      return sortBy(tasks, t => t.additional!.detail!.create_time).reverse();

    case "completed-percent-asc":
      return sortBy(sortTasks(tasks, "name-asc"), fractionComplete);

    case "completed-percent-desc":
      return sortBy(sortTasks(tasks, "name-desc"), fractionComplete).reverse();

    default:
      return assertNever(taskSortType);
  }
}

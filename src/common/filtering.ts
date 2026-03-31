import {
  DownloadStationTask,
  DownloadStationTaskNormalStatus,
  DownloadStationTaskErrorStatus,
  ALL_TASK_ERROR_STATUSES,
  ALL_TASK_NORMAL_STATUSES,
} from "../common/apis/synology/DownloadStation/Task";
import type { VisibleTaskSettings, TaskSortType } from "./state/defaults";
import { assertNever, recordKeys } from "./lang";

const EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES: {
  [K in "downloading" | "uploading" | "completed"]: DownloadStationTaskNormalStatus[];
} = {
  downloading: ["downloading", "extracting", "finishing", "hash_checking"],
  uploading: ["seeding"],
  completed: ["finished"],
};

{
  // Compile-time unit test.
  const _1: keyof VisibleTaskSettings =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    null as any as keyof typeof EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES;
  void _1;
}

const EXPLICITLY_SPECIFIED_TYPES = recordKeys(EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES).reduce(
  (acc, key) => [...acc, ...EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES[key]],
  [] as DownloadStationTaskNormalStatus[],
);

const ERRORED_TYPES = [
  ...(ALL_TASK_ERROR_STATUSES as (
    | DownloadStationTaskNormalStatus
    | DownloadStationTaskErrorStatus
  )[]),
  "error" as const,
];

const OTHER_STATUSES = ALL_TASK_NORMAL_STATUSES.filter(
  (status) =>
    EXPLICITLY_SPECIFIED_TYPES.indexOf(status) === -1 && ERRORED_TYPES.indexOf(status) === -1,
);

const TASK_FILTER_TO_TYPES: Record<
  keyof VisibleTaskSettings,
  (DownloadStationTaskNormalStatus | DownloadStationTaskErrorStatus)[]
> = {
  ...EXPLICIT_TASK_FILTER_TO_NORMAL_TYPES,
  errored: ERRORED_TYPES,
  other: OTHER_STATUSES,
};

export function matchesFilter(task: DownloadStationTask, filterName: keyof VisibleTaskSettings) {
  return TASK_FILTER_TO_TYPES[filterName].includes(task.status);
}

export function filterTasks(
  tasks: DownloadStationTask[],
  visibleTasks: VisibleTaskSettings,
  showInactiveTasks: boolean,
) {
  return tasks.filter(
    (t) =>
      ((visibleTasks.downloading && matchesFilter(t, "downloading")) ||
        (visibleTasks.uploading && matchesFilter(t, "uploading")) ||
        (visibleTasks.completed && matchesFilter(t, "completed")) ||
        (visibleTasks.errored && matchesFilter(t, "errored")) ||
        (visibleTasks.other && matchesFilter(t, "other"))) &&
      (showInactiveTasks || isActive(t)),
  );
}

function isActive(task: DownloadStationTask) {
  return (
    task.additional!.transfer!.speed_upload > 0 || task.additional!.transfer!.speed_download > 0
  );
}

function fractionComplete(task: DownloadStationTask) {
  return task.additional!.transfer!.size_downloaded / task.size;
}

function sortedBy<T>(arr: T[], key: (item: T) => number | string): T[] {
  return [...arr].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

export function sortTasks(
  tasks: DownloadStationTask[],
  taskSortType: TaskSortType,
): DownloadStationTask[] {
  const isCompletedOrUploading = (t: DownloadStationTask) =>
    matchesFilter(t, "completed") || matchesFilter(t, "uploading");

  switch (taskSortType) {
    case "name-asc":
      return sortedBy(tasks, (t) => t.title.toLocaleLowerCase());

    case "name-desc":
      return sortedBy(tasks, (t) => t.title.toLocaleLowerCase()).reverse();

    case "timestamp-completed-asc": {
      const completed = tasks.filter(isCompletedOrUploading);
      const incomplete = tasks.filter((t) => !isCompletedOrUploading(t));
      return [
        ...sortedBy(incomplete, (t) => -fractionComplete(t)),
        ...sortedBy(completed, (t) => t.additional!.detail!.completed_time),
      ];
    }

    case "timestamp-completed-desc": {
      const completed = tasks.filter(isCompletedOrUploading);
      const incomplete = tasks.filter((t) => !isCompletedOrUploading(t));
      return [
        ...sortedBy(incomplete, (t) => -fractionComplete(t)),
        ...sortedBy(completed, (t) => -t.additional!.detail!.completed_time),
      ];
    }

    case "timestamp-added-asc":
      return sortedBy(tasks, (t) => t.additional!.detail!.create_time);

    case "timestamp-added-desc":
      return sortedBy(tasks, (t) => t.additional!.detail!.create_time).reverse();

    case "completed-percent-asc":
      return sortedBy(sortTasks(tasks, "name-asc"), fractionComplete);

    case "completed-percent-desc":
      return sortedBy(sortTasks(tasks, "name-desc"), fractionComplete).reverse();

    default:
      return assertNever(taskSortType);
  }
}

import type { DownloadStationTask } from "../../src/common/apis/synology/DownloadStation/Task";
import type { Settings, TaskState } from "../../src/common/state";

export const SETTINGS: Settings = {
  connection: {
    identifiers: {
      protocol: "https",
      hostname: "diskstation.local",
      port: 5001,
      username: "admin",
    },
    secrets: { password: "password", deviceToken: undefined },
    rememberSecrets: true,
  },
  // Errored is off so that the errored task below lands behind the "N more hidden" row, which is
  // what makes the filtering screenshot show something worth filtering.
  visibleTasks: {
    downloading: true,
    uploading: true,
    completed: true,
    errored: false,
    other: true,
  },
  notifications: {
    enableCompletionNotifications: true,
    enableFeedbackNotifications: true,
  },
  shouldHandleDownloadLinks: true,
  taskSortType: "name-asc",
  badgeDisplayType: "total",
  showInactiveTasks: true,
};

interface TaskInput {
  id: string;
  title: string;
  status: DownloadStationTask["status"];
  size: number;
  downloaded: number;
  uploaded?: number;
  downloadSpeed?: number;
  uploadSpeed?: number;
  ageSeconds: number;
}

// Cast wholesale like the tests do: the popup reads a handful of `additional` fields and nothing
// else, and spelling out all of DownloadStationTaskDetail would be noise.
function task({
  id,
  title,
  status,
  size,
  downloaded,
  uploaded,
  downloadSpeed,
  uploadSpeed,
  ageSeconds,
}: TaskInput): DownloadStationTask {
  const now = Math.floor(Date.now() / 1000);
  return {
    id,
    type: "bt",
    username: "admin",
    title,
    size,
    status,
    additional: {
      detail: {
        create_time: now - ageSeconds,
        completed_time: downloaded === size ? now - Math.floor(ageSeconds / 2) : 0,
      },
      transfer: {
        size_downloaded: downloaded,
        size_uploaded: uploaded ?? 0,
        speed_download: downloadSpeed ?? 0,
        speed_upload: uploadSpeed ?? 0,
      },
    },
  } as DownloadStationTask;
}

const GIGABYTE = 1024 * 1024 * 1024;
const MEGABYTE = 1024 * 1024;

// Ordered so that a prefix of it is a whole scenario. The errored task comes second, which is what
// puts exactly one task behind the "N more hidden" row in everything but the single-task scenario.
const TASKS: DownloadStationTask[] = [
  task({
    id: "1",
    title: "debian-13.1.0-amd64-netinst.iso",
    status: "downloading",
    size: 1.24 * GIGABYTE,
    downloaded: 0.77 * GIGABYTE,
    downloadSpeed: 4.2 * MEGABYTE,
    ageSeconds: 190,
  }),
  task({
    id: "2",
    title: "enwiki-20260801-pages-articles-multistream.xml.bz2",
    status: "error",
    size: 23.4 * GIGABYTE,
    downloaded: 8.1 * GIGABYTE,
    ageSeconds: 720,
  }),
  task({
    id: "3",
    title: "big-buck-bunny-1080p-30fps.mp4",
    status: "finished",
    size: 1.2 * GIGABYTE,
    downloaded: 1.2 * GIGABYTE,
    ageSeconds: 5400,
  }),
  task({
    id: "4",
    title: "ubuntu-24.04.3-desktop-amd64.iso",
    status: "downloading",
    size: 5.9 * GIGABYTE,
    downloaded: 1.4 * GIGABYTE,
    downloadSpeed: 11.7 * MEGABYTE,
    ageSeconds: 130,
  }),
  task({
    id: "5",
    title: "tears-of-steel-1080p-surround.mkv",
    status: "finished",
    size: 3.7 * GIGABYTE,
    downloaded: 3.7 * GIGABYTE,
    uploaded: 1.9 * GIGABYTE,
    uploadSpeed: 0.6 * MEGABYTE,
    ageSeconds: 21600,
  }),
  task({
    id: "6",
    title: "sprite-fright-4k-surround.mov",
    status: "downloading",
    size: 18.2 * GIGABYTE,
    downloaded: 2.3 * GIGABYTE,
    downloadSpeed: 8.4 * MEGABYTE,
    ageSeconds: 460,
  }),
  task({
    id: "7",
    title: "librivox-the-time-machine-64kb-mp3.zip",
    status: "finished",
    size: 0.18 * GIGABYTE,
    downloaded: 0.18 * GIGABYTE,
    ageSeconds: 86400,
  }),
  task({
    id: "8",
    title: "cosmos-laundromat-1080p.mp4",
    status: "finished",
    size: 2.1 * GIGABYTE,
    downloaded: 2.1 * GIGABYTE,
    uploaded: 0.4 * GIGABYTE,
    ageSeconds: 43200,
  }),
];

const FETCHED_JUST_NOW = {
  tasksLastInitiatedFetchTimestamp: Date.now() - 3000,
  tasksLastCompletedFetchTimestamp: Date.now() - 3000,
};

export interface Scenario {
  name: string;
  state: TaskState;
}

// Indexed by the number key that selects them, shortest first.
export const SCENARIOS: Scenario[] = [
  { name: "no tasks", state: { tasks: [], ...FETCHED_JUST_NOW } },
  // One task and nothing hidden, so the filter panel fits the frame with a task list under it.
  { name: "1 task", state: { tasks: TASKS.slice(0, 1), ...FETCHED_JUST_NOW } },
  { name: "3 tasks", state: { tasks: TASKS.slice(0, 3), ...FETCHED_JUST_NOW } },
  { name: "8 tasks", state: { tasks: TASKS, ...FETCHED_JUST_NOW } },
  { name: "login required", state: { taskFetchFailureReason: "login-required" } },
];

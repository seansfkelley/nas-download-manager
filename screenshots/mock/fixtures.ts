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

const TYPICAL_TASKS: DownloadStationTask[] = [
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
    title: "big-buck-bunny-1080p-30fps.mp4",
    status: "finished",
    size: 1.2 * GIGABYTE,
    downloaded: 1.2 * GIGABYTE,
    ageSeconds: 5400,
  }),
  task({
    id: "3",
    title: "enwiki-20260801-pages-articles-multistream.xml.bz2",
    status: "error",
    size: 23.4 * GIGABYTE,
    downloaded: 8.1 * GIGABYTE,
    ageSeconds: 720,
  }),
];

const LONG_TASK_LIST: DownloadStationTask[] = [
  "charge-blender-open-movie-2160p.mp4",
  "cosmos-laundromat-1080p.mp4",
  "debian-13.1.0-amd64-netinst.iso",
  "librivox-the-time-machine-64kb-mp3.zip",
  "night-of-the-living-dead-1968-1080p.mkv",
  "planet-260810.osm.pbf",
  "plan-9-from-outer-space-1959.mkv",
  "spring-blender-open-movie-2160p.mp4",
  "sprite-fright-4k-surround.mov",
  "tears-of-steel-1080p-surround.mkv",
  "ubuntu-24.04.3-desktop-amd64.iso",
  "wikidata-20260803-all.json.gz",
].map((title, i) =>
  task({
    id: `long-${i}`,
    title,
    status: i % 3 === 0 ? "downloading" : "finished",
    size: (1 + i / 4) * GIGABYTE,
    downloaded: i % 3 === 0 ? (0.4 + i / 20) * GIGABYTE : (1 + i / 4) * GIGABYTE,
    downloadSpeed: i % 3 === 0 ? (1 + i) * MEGABYTE : 0,
    ageSeconds: 300 * (i + 1),
  }),
);

const FETCHED_JUST_NOW = {
  tasksLastInitiatedFetchTimestamp: Date.now() - 3000,
  tasksLastCompletedFetchTimestamp: Date.now() - 3000,
};

export interface Scenario {
  name: string;
  state: TaskState;
}

export const SCENARIOS: Scenario[] = [
  { name: "typical", state: { tasks: TYPICAL_TASKS, ...FETCHED_JUST_NOW } },
  { name: "no tasks", state: { tasks: [], ...FETCHED_JUST_NOW } },
  { name: "login required", state: { taskFetchFailureReason: "login-required" } },
  { name: "long task list", state: { tasks: LONG_TASK_LIST, ...FETCHED_JUST_NOW } },
];

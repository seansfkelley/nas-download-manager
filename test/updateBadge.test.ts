import { updateBadge } from "../src/background/state-listeners/updateBadge";
import type { DownloadStationTask } from "../src/common/apis/synology/DownloadStation/Task";
import type { Settings } from "../src/common/state/migrations/latest";

const SETTINGS: Settings = {
  connection: {
    identifiers: {
      protocol: "https",
      hostname: "hostname",
      port: 5001,
      username: "username",
    },
    secrets: { password: "password", deviceToken: undefined },
    rememberSecrets: true,
  },
  visibleTasks: {
    downloading: true,
    uploading: true,
    completed: true,
    errored: true,
    other: true,
  },
  notifications: {
    enableCompletionNotifications: false,
    enableFeedbackNotifications: true,
  },
  shouldHandleDownloadLinks: true,
  taskSortType: "name-asc",
  badgeDisplayType: "total",
  showInactiveTasks: true,
};

interface MockTaskInput {
  id: string;
  status: DownloadStationTask["status"];
  speed?: number;
}

function mockTask({ id, status, speed }: MockTaskInput): DownloadStationTask {
  return {
    id,
    title: id,
    status,
    size: 100,
    additional: {
      transfer: {
        size_downloaded: 0,
        speed_download: speed ?? 0,
        speed_upload: 0,
      },
    },
  } as DownloadStationTask;
}

let setIcon: jest.Mock;
let setBadgeText: jest.Mock;
let setBadgeBackgroundColor: jest.Mock;

function badgeText() {
  expect(setBadgeText).toHaveBeenCalledTimes(1);
  return setBadgeText.mock.calls[0][0].text;
}

function iconPaths(): Record<string, string> {
  expect(setIcon).toHaveBeenCalledTimes(1);
  return setIcon.mock.calls[0][0].path;
}

beforeEach(() => {
  setIcon = jest.fn();
  setBadgeText = jest.fn();
  setBadgeBackgroundColor = jest.fn();
  Object.assign(globalThis.browser, {
    action: { setIcon, setBadgeText, setBadgeBackgroundColor },
  });
});

it("should show the disabled icon and no count when the fetch failed", async () => {
  await updateBadge(SETTINGS, {
    tasks: [mockTask({ id: "1", status: "downloading" })],
    taskFetchFailureReason: "missing-config",
  });

  expect(Object.values(iconPaths())).toSatisfyAll((path: string) => path.includes("disabled"));
  expect(badgeText()).toBe("");
  expect(setBadgeBackgroundColor).toHaveBeenCalledWith({ color: [217, 0, 0, 255] });
});

it("should show the enabled icon and no count when tasks have not been fetched yet", async () => {
  await updateBadge(SETTINGS, {});

  expect(Object.values(iconPaths())).toSatisfyAll((path: string) => !path.includes("disabled"));
  expect(badgeText()).toBe("");
  expect(setBadgeBackgroundColor).toHaveBeenCalledWith({ color: [0, 217, 0, 255] });
});

it("should show nothing rather than a zero when there are no tasks", async () => {
  await updateBadge(SETTINGS, { tasks: [] });

  expect(badgeText()).toBe("");
});

it("should count every task when displaying the total", async () => {
  await updateBadge(
    { ...SETTINGS, badgeDisplayType: "total" },
    {
      tasks: [
        mockTask({ id: "1", status: "downloading" }),
        mockTask({ id: "2", status: "finished" }),
        mockTask({ id: "3", status: "error" }),
      ],
    },
  );

  expect(badgeText()).toBe("3");
});

it("should count only visible tasks when displaying the filtered count", async () => {
  await updateBadge(
    {
      ...SETTINGS,
      badgeDisplayType: "filtered",
      visibleTasks: { ...SETTINGS.visibleTasks, errored: false },
    },
    {
      tasks: [
        mockTask({ id: "1", status: "downloading" }),
        mockTask({ id: "2", status: "finished" }),
        mockTask({ id: "3", status: "error" }),
      ],
    },
  );

  expect(badgeText()).toBe("2");
});

it("should count only active tasks when displaying the filtered count and hiding inactive tasks", async () => {
  await updateBadge(
    { ...SETTINGS, badgeDisplayType: "filtered", showInactiveTasks: false },
    {
      tasks: [
        mockTask({ id: "1", status: "downloading", speed: 100 }),
        mockTask({ id: "2", status: "downloading" }),
      ],
    },
  );

  expect(badgeText()).toBe("1");
});

it("should count finished and seeding tasks when displaying the completed count", async () => {
  await updateBadge(
    { ...SETTINGS, badgeDisplayType: "completed" },
    {
      tasks: [
        mockTask({ id: "1", status: "downloading" }),
        mockTask({ id: "2", status: "finished" }),
        mockTask({ id: "3", status: "seeding" }),
      ],
    },
  );

  expect(badgeText()).toBe("2");
});

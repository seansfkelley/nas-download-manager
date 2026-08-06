import type { DownloadStationTask } from "../src/common/apis/synology/DownloadStation/Task";
import { State } from "../src/common/state/migrations/latest";
import { LATEST_STATE_VERSION } from "../src/common/state/migrations/update";
import type { State as State_2 } from "../src/common/state/migrations/2";

let stored: Record<string, any>;

function install() {
  stored = {};
  (globalThis as any).browser = {
    storage: {
      local: {
        async get(keys: string | string[] | null) {
          if (keys == null) {
            return { ...stored };
          }
          const names = typeof keys === "string" ? [keys] : keys;
          return Object.fromEntries(names.filter((n) => n in stored).map((n) => [n, stored[n]]));
        },
        async set(values: Record<string, any>) {
          Object.assign(stored, values);
        },
        async remove(keys: string[]) {
          keys.forEach((k) => delete stored[k]);
        },
      },
    },
  };
}

const DUMMY_TASK: DownloadStationTask = {
  id: "id",
  type: "http",
  username: "username",
  title: "title",
  size: 0,
  status: "downloading",
};

const STATE_2: State_2 = {
  connection: {
    protocol: "http",
    hostname: "hostname",
    port: 0,
    username: "username",
    password: "password",
  },
  visibleTasks: {
    downloading: true,
    uploading: false,
    completed: true,
    errored: false,
    other: true,
  },
  notifications: {
    enableCompletionNotifications: true,
    enableFeedbackNotifications: true,
    completionPollingInterval: 0,
  },
  taskSortType: "name-asc",
  tasks: [DUMMY_TASK],
  taskFetchFailureReason: null,
  tasksLastCompletedFetchTimestamp: 0,
  tasksLastInitiatedFetchTimestamp: 0,
  shouldHandleDownloadLinks: true,
  lastSevereError: undefined,
  stateVersion: 2,
};

describe("stored state", () => {
  beforeEach(install);

  it("should migrate on read", async () => {
    Object.assign(stored, STATE_2);

    const state = await State.get();

    expect(state.stateVersion).toBe(LATEST_STATE_VERSION);
    expect(state.settings.connection.hostname).toBe("hostname");
    expect(stored.stateVersion).toBe(LATEST_STATE_VERSION);
  });

  it("should drop the keys the migration abandoned", async () => {
    Object.assign(stored, STATE_2, { neverHeardOfIt: true });

    await State.get();

    expect(Object.keys(stored).sort()).toStrictEqual([
      "lastSevereError",
      "settings",
      "stateVersion",
      "taskFetchFailureReason",
      "tasks",
      "tasksLastCompletedFetchTimestamp",
      "tasksLastInitiatedFetchTimestamp",
    ]);
  });

  it("should bring a stale state current before writing a partial into it", async () => {
    Object.assign(stored, STATE_2);

    await State.set({ tasks: [] });

    expect(stored.stateVersion).toBe(LATEST_STATE_VERSION);
    expect(stored.tasks).toStrictEqual([]);
    expect(stored.settings.connection.hostname).toBe("hostname");
    expect(stored.connection).toBeUndefined();
  });

  it("should leave the other keys alone when writing a partial into a current state", async () => {
    await State.set({});
    const { settings } = stored;

    await State.set({ tasks: [DUMMY_TASK] });

    expect(stored.settings).toBe(settings);
    expect(stored.tasks).toStrictEqual([DUMMY_TASK]);
  });
});

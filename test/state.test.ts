import type { DownloadStationTask } from "../src/common/apis/synology/DownloadStation/Task";
import { migrateStoredState } from "../src/common/state/migrate";
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

describe("migrating stored state", () => {
  beforeEach(install);

  it("should bring a stale profile fully current", async () => {
    Object.assign(stored, STATE_2);

    await migrateStoredState();

    expect(stored.stateVersion).toBe(LATEST_STATE_VERSION);
    expect(stored.settings.connection.hostname).toBe("hostname");
  });

  it("should drop the keys the migration abandoned", async () => {
    Object.assign(stored, STATE_2, { neverHeardOfIt: true });

    await migrateStoredState();

    expect(Object.keys(stored).sort()).toStrictEqual([
      "lastSevereError",
      "settings",
      "stateVersion",
    ]);
  });

  it("should populate an empty profile", async () => {
    await migrateStoredState();

    expect(stored.stateVersion).toBe(LATEST_STATE_VERSION);
    expect(stored.settings).not.toBeNil();
  });

  it("should leave an already-current profile alone", async () => {
    await migrateStoredState();
    const { settings } = stored;

    await migrateStoredState();

    expect(stored.settings).toBe(settings);
  });

  it("should not write anything when it fails", async () => {
    Object.assign(stored, STATE_2);
    const originalKeys = Object.keys(stored).sort();
    (globalThis as any).browser.storage.local.set = () => Promise.reject(new Error("nope"));

    await expect(migrateStoredState()).rejects.toThrow("nope");

    // The whole-object write is the first write, so a failure there leaves the profile as it was
    // rather than half-migrated. This is what lets the caller bail and report.
    expect(Object.keys(stored).sort()).toStrictEqual(originalKeys);
    expect(stored.stateVersion).toBe(2);
  });
});

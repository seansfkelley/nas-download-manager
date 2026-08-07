import { reactToPersistentState, reactToSessionState } from "../src/common/state/listen";
import {
  ALL_STORED_STATE_NAMES,
  type PersistentState,
} from "../src/common/state/migrations/latest";
import type { SessionState } from "../src/common/state/session";

type ChangeListener = (changes: Record<string, browser.storage.StorageChange>) => void;

interface MockStorageArea {
  contents: object;
  get: jest.Mock;
  onChanged: { addListener: (listener: ChangeListener) => void };
  emitChange: (...keys: string[]) => void;
}

function mockStorageArea(): MockStorageArea {
  const listeners: ChangeListener[] = [];
  const area: MockStorageArea = {
    contents: {},
    get: jest.fn(async () => area.contents),
    onChanged: {
      addListener: (listener) => {
        listeners.push(listener);
      },
    },
    emitChange: (...keys) => {
      const changes = Object.fromEntries(keys.map((k) => [k, {}]));
      listeners.forEach((listener) => listener(changes));
    },
  };
  return area;
}

// The listeners fire off unawaited promises, so a task queue turn is needed before asserting.
function flush() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

const SETTINGS: PersistentState["settings"] = {
  connection: {
    protocol: "https",
    hostname: "hostname",
    port: 5001,
    username: "username",
    password: "password",
    rememberPassword: true,
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
    completionPollingInterval: 60,
  },
  shouldHandleDownloadLinks: true,
  taskSortType: "name-asc",
  badgeDisplayType: "total",
  showInactiveTasks: true,
};

const PERSISTENT_STATE: PersistentState = {
  settings: SETTINGS,
  lastSevereError: "error",
  stateVersion: 9,
};

describe("state listeners", () => {
  let local: MockStorageArea;
  let session: MockStorageArea;

  beforeEach(() => {
    local = mockStorageArea();
    session = mockStorageArea();
    Object.assign(globalThis.browser, { storage: { local, session } });
  });

  describe("reactToPersistentState", () => {
    it("should call the listener with the initial state", async () => {
      local.contents = PERSISTENT_STATE;
      const listener = jest.fn();

      reactToPersistentState("settings", listener);
      await flush();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ settings: SETTINGS });
    });

    it("should pass only the requested keys", async () => {
      local.contents = PERSISTENT_STATE;
      const listener = jest.fn();

      reactToPersistentState("settings", "stateVersion", listener);
      await flush();

      expect(listener).toHaveBeenCalledWith({ settings: SETTINGS, stateVersion: 9 });
    });

    it("should read only the keys that make up the persistent state", async () => {
      local.contents = PERSISTENT_STATE;

      reactToPersistentState("settings", jest.fn());
      await flush();

      expect(local.get).toHaveBeenCalledWith(ALL_STORED_STATE_NAMES);
    });

    it("should not call the listener when the stored state has not been migrated yet", async () => {
      local.contents = { ...PERSISTENT_STATE, stateVersion: 8 };
      const listener = jest.fn();

      reactToPersistentState("settings", listener);
      await flush();

      expect(listener).not.toHaveBeenCalled();
    });

    it("should call the listener again when a listened-to key changes", async () => {
      local.contents = PERSISTENT_STATE;
      const listener = jest.fn();

      reactToPersistentState("settings", listener);
      await flush();

      const updatedSettings = { ...SETTINGS, showInactiveTasks: false };
      local.contents = { ...PERSISTENT_STATE, settings: updatedSettings };
      local.emitChange("settings");
      await flush();

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith({ settings: updatedSettings });
    });

    it("should not call the listener when only unrelated keys change", async () => {
      local.contents = PERSISTENT_STATE;
      const listener = jest.fn();

      reactToPersistentState("settings", listener);
      await flush();
      local.emitChange("lastSevereError");
      await flush();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("reactToSessionState", () => {
    it("should call the listener with the initial state", async () => {
      const state: SessionState = { tasks: [], tasksLastCompletedFetchTimestamp: 1 };
      session.contents = state;
      const listener = jest.fn();

      reactToSessionState("tasks", listener);
      await flush();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ tasks: [] });
    });

    it("should call the listener even when nothing has been written yet", async () => {
      const listener = jest.fn();

      reactToSessionState("tasks", listener);
      await flush();

      expect(listener).toHaveBeenCalledWith({ tasks: undefined });
    });

    it("should call the listener when any one of several listened-to keys changes", async () => {
      const listener = jest.fn();

      reactToSessionState("tasks", "taskFetchFailureReason", listener);
      await flush();

      session.contents = { taskFetchFailureReason: "missing-config" } satisfies SessionState;
      session.emitChange("taskFetchFailureReason");
      await flush();

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith({
        tasks: undefined,
        taskFetchFailureReason: "missing-config",
      });
    });

    it("should not react to changes in the local storage area", async () => {
      const listener = jest.fn();

      reactToSessionState("tasks", listener);
      await flush();
      local.emitChange("tasks");
      await flush();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});

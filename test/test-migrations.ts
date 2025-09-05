import "mocha";
import { expect } from "chai";
import { cloneDeep } from "lodash";

import type { DownloadStationTask } from "../src/common/apis/synology/DownloadStation/Task";
import { migrateState } from "../src/common/state/migrations/update";
import type { State as State_1 } from "../src/common/state/migrations/1";
import type { State as State_2 } from "../src/common/state/migrations/2";
import type { State as State_3 } from "../src/common/state/migrations/3";
import type { State as State_4 } from "../src/common/state/migrations/4";
import type { State as State_5 } from "../src/common/state/migrations/5";
import type { State as State_6 } from "../src/common/state/migrations/6";
import type { State as State_7 } from "../src/common/state/migrations/7";
import type { State as State_8 } from "../src/common/state/migrations/8";

interface PreVersioningState_0 {
  connection: {
    protocol: "http" | "https";
    hostname: string;
    port: number;
    username: string;
    password: string;
  };
  visibleTasks: {
    downloading: boolean;
    uploading: boolean;
    completed: boolean;
    errored: boolean;
    other: boolean;
  };
  notifications: {
    enabled: boolean;
    pollingInterval: number;
  };
  tasks: DownloadStationTask[];
  taskFetchFailureReason: "missing-config" | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
}

interface PreVersioningState_1 extends PreVersioningState_0 {
  taskSortType:
    | "name-asc"
    | "name-desc"
    | "timestamp-completed-asc"
    | "timestamp-completed-desc"
    | "timestamp-added-asc"
    | "timestamp-added-desc"
    | "completed-percent-asc"
    | "completed-percent-desc";
  shouldHandleDownloadLinks: boolean;
  cachedTasksVersion?: number;
}

const DUMMY_TASK: DownloadStationTask = {
  id: "id",
  type: "http",
  username: "username",
  title: "title",
  size: 0,
  status: "downloading",
};

function testMigration<T, P>(before: T, after: P) {
  const originalBefore = cloneDeep(before);
  const transitioned = migrateState(before, after);

  expect(before).to.not.deep.equal(after);
  expect(before).to.deep.equal(originalBefore);
  expect(transitioned).to.deep.equal(after);
}

describe("state versioning", () => {
  it("should update to the latest version from pre-version 0", () => {
    testMigration<PreVersioningState_0, State_8>(
      {
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
          enabled: true,
          pollingInterval: 0,
        },
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
      },
      {
        settings: {
          connection: {
            deviceId: "",
            deviceName: "",
            hostname: "hostname",
            otpCode: "",
            port: 0,
            username: "username",
            password: "password",
            rememberPassword: true,
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
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
          showInactiveTasks: true,
        },
        tasks: [],
        taskFetchFailureReason: null,
        tasksLastCompletedFetchTimestamp: null,
        tasksLastInitiatedFetchTimestamp: null,
        lastSevereError: undefined,
        stateVersion: 8,
      },
    );
  });

  it("should update to the latest version from pre-version 1", () => {
    testMigration<PreVersioningState_1, State_8>(
      {
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
          enabled: true,
          pollingInterval: 0,
        },
        taskSortType: "name-asc",
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        shouldHandleDownloadLinks: true,
        cachedTasksVersion: 0,
      },
      {
        settings: {
          connection: {
            deviceId: "",
            deviceName: "",
            hostname: "hostname",
            otpCode: "",
            port: 0,
            username: "username",
            password: "password",
            rememberPassword: true,
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
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
          showInactiveTasks: true,
        },

        tasks: [],
        taskFetchFailureReason: null,
        tasksLastCompletedFetchTimestamp: null,
        tasksLastInitiatedFetchTimestamp: null,
        lastSevereError: undefined,
        stateVersion: 8,
      },
    );
  });

  it("should update to the latest version with a degenerate tasks-only state", () => {
    testMigration<{ tasks: unknown[] }, State_8>(
      { tasks: [] },
      {
        settings: {
          connection: {
            deviceId: "",
            deviceName: "",
            hostname: "",
            otpCode: "",
            port: 5001,
            username: "",
            password: "",
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
        },

        tasks: [],
        taskFetchFailureReason: null,
        tasksLastCompletedFetchTimestamp: null,
        tasksLastInitiatedFetchTimestamp: null,
        lastSevereError: undefined,
        stateVersion: 8,
      },
    );
  });

  it("should update to the latest version from version 0 (no state)", () => {
    testMigration<null, State_8>(null, {
      settings: {
        connection: {
          deviceId: "",
          deviceName: "",
          hostname: "",
          otpCode: "",
          port: 5001,
          username: "",
          password: "",
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
      },
      tasks: [],
      taskFetchFailureReason: null,
      tasksLastCompletedFetchTimestamp: null,
      tasksLastInitiatedFetchTimestamp: null,
      lastSevereError: undefined,
      stateVersion: 8,
    });
  });

  it("should update to the latest version from version 1 and unset task data and metadata", () => {
    testMigration<State_1, State_8>(
      {
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
          enabled: true,
          pollingInterval: 0,
        },
        cachedTasksVersion: 1,
        taskSortType: "name-asc",
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        shouldHandleDownloadLinks: true,
        stateVersion: 1,
      },
      {
        settings: {
          connection: {
            deviceId: "",
            deviceName: "",
            hostname: "hostname",
            otpCode: "",
            port: 0,
            username: "username",
            password: "password",
            rememberPassword: true,
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
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
          showInactiveTasks: true,
        },
        tasks: [],
        taskFetchFailureReason: null,
        tasksLastCompletedFetchTimestamp: null,
        tasksLastInitiatedFetchTimestamp: null,
        lastSevereError: undefined,
        stateVersion: 8,
      },
    );
  });

  it("should update to the latest version from version 2", () => {
    testMigration<State_2, State_8>(
      {
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
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        shouldHandleDownloadLinks: true,
        lastSevereError: new Error(),
        stateVersion: 2,
      },
      {
        settings: {
          connection: {
            deviceId: "",
            deviceName: "",
            hostname: "hostname",
            otpCode: "",
            port: 0,
            username: "username",
            password: "password",
            rememberPassword: true,
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
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
          showInactiveTasks: true,
        },
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: undefined,
        stateVersion: 8,
      },
    );
  });

  it("should update to the latest version from an erroneous version 2 missing fields", () => {
    testMigration<Omit<State_2, "taskSortType" | "shouldHandleDownloadLinks">, State_8>(
      {
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
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: new Error(),
        stateVersion: 2,
      },
      {
        settings: {
          connection: {
            deviceId: "",
            deviceName: "",
            hostname: "hostname",
            otpCode: "",
            port: 0,
            username: "username",
            password: "password",
            rememberPassword: true,
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
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
          showInactiveTasks: true,
        },
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: undefined,
        stateVersion: 8,
      },
    );
  });

  it("should add badgeDisplayType when upgrading from 3 to 4", () => {
    testMigration<State_3, State_4>(
      {
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
        shouldHandleDownloadLinks: true,
        taskSortType: "name-asc",
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: undefined,
        stateVersion: 3,
      },
      {
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
        shouldHandleDownloadLinks: true,
        taskSortType: "name-asc",
        badgeDisplayType: "total",
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: undefined,
        stateVersion: 4,
      },
    );
  });

  it("should inline settings when upgrading from 4 to 5", () => {
    testMigration<State_4, State_5>(
      {
        connection: {
          protocol: "http",
          hostname: "hostname",
          port: 0,
          username: "username",
          password: "password",
        },
        visibleTasks: {
          downloading: true,
          uploading: true,
          completed: true,
          errored: true,
          other: true,
        },
        notifications: {
          enableCompletionNotifications: true,
          enableFeedbackNotifications: true,
          completionPollingInterval: 0,
        },
        shouldHandleDownloadLinks: true,
        taskSortType: "name-asc",
        badgeDisplayType: "total",
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: undefined,
        stateVersion: 4,
      },
      {
        settings: {
          connection: {
            protocol: "http",
            hostname: "hostname",
            port: 0,
            username: "username",
            password: "password",
          },
          visibleTasks: {
            downloading: true,
            uploading: true,
            completed: true,
            errored: true,
            other: true,
          },
          notifications: {
            enableCompletionNotifications: true,
            enableFeedbackNotifications: true,
            completionPollingInterval: 0,
          },
          taskSortType: "name-asc",
          badgeDisplayType: "total",
          shouldHandleDownloadLinks: true,
        },
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: undefined,
        stateVersion: 5,
      },
    );
  });

  it("should remove the protocol setting when upgrading from 5 to 6", () => {
    testMigration<State_5, State_6>(
      {
        settings: {
          connection: {
            protocol: "http",
            hostname: "hostname",
            port: 0,
            username: "username",
            password: "password",
          },
          visibleTasks: {
            downloading: true,
            uploading: true,
            completed: true,
            errored: true,
            other: true,
          },
          notifications: {
            enableCompletionNotifications: true,
            enableFeedbackNotifications: true,
            completionPollingInterval: 0,
          },
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
        },
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: undefined,
        stateVersion: 5,
      },
      {
        settings: {
          connection: {
            hostname: "hostname",
            port: 0,
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
            enableCompletionNotifications: true,
            enableFeedbackNotifications: true,
            completionPollingInterval: 0,
          },
          taskSortType: "name-asc",
          badgeDisplayType: "total",
          shouldHandleDownloadLinks: true,
        },
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: undefined,
        stateVersion: 6,
      },
    );
  });

  it("should default show-inactive-tasks to true when upgrading from 6 to 7", () => {
    testMigration<State_6, State_7>(
      {
        settings: {
          connection: {
            hostname: "hostname",
            port: 0,
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
            enableCompletionNotifications: true,
            enableFeedbackNotifications: true,
            completionPollingInterval: 0,
          },
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
        },
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: undefined,
        stateVersion: 6,
      },
      {
        settings: {
          connection: {
            hostname: "hostname",
            port: 0,
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
            enableCompletionNotifications: true,
            enableFeedbackNotifications: true,
            completionPollingInterval: 0,
          },
          taskSortType: "name-asc",
          badgeDisplayType: "total",
          showInactiveTasks: true,
          shouldHandleDownloadLinks: true,
        },
        tasks: [DUMMY_TASK],
        taskFetchFailureReason: "missing-config",
        tasksLastCompletedFetchTimestamp: 0,
        tasksLastInitiatedFetchTimestamp: 0,
        lastSevereError: undefined,
        stateVersion: 7,
      },
    );
  });

  it("should add 2-FA settings when upgrading from 7 to 8", () => {
    testMigration<State_7, State_8>(
      {
        settings: {
          connection: {
            hostname: "hostname",
            port: 0,
            username: "username",
            password: "password",
            rememberPassword: true,
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
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
          showInactiveTasks: true,
        },
        tasks: [],
        taskFetchFailureReason: null,
        tasksLastCompletedFetchTimestamp: null,
        tasksLastInitiatedFetchTimestamp: null,
        lastSevereError: undefined,
        stateVersion: 7,
      },
      {
        settings: {
          connection: {
            deviceId: "",
            deviceName: "",
            hostname: "hostname",
            otpCode: "",
            port: 0,
            username: "username",
            password: "password",
            rememberPassword: true,
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
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
          showInactiveTasks: true,
        },
        tasks: [],
        taskFetchFailureReason: null,
        tasksLastCompletedFetchTimestamp: null,
        tasksLastInitiatedFetchTimestamp: null,
        lastSevereError: undefined,
        stateVersion: 8,
      },
    );
  });

  it("should do nothing when the state is already latest", () => {
    const before: State_8 = {
      settings: {
        connection: {
          deviceId: "",
          deviceName: "",
          hostname: "hostname",
          otpCode: "",
          port: 0,
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
          enableCompletionNotifications: true,
          enableFeedbackNotifications: true,
          completionPollingInterval: 0,
        },
        taskSortType: "name-asc",
        badgeDisplayType: "total",
        showInactiveTasks: true,
        shouldHandleDownloadLinks: true,
      },
      tasks: [DUMMY_TASK],
      taskFetchFailureReason: "missing-config",
      tasksLastCompletedFetchTimestamp: 0,
      tasksLastInitiatedFetchTimestamp: 0,
      lastSevereError: undefined,
      stateVersion: 8,
    };

    expect(migrateState(before, before)).to.equal(before);
  });

  it("should silently create an empty state if the given version is too new", () => {
    expect(migrateState({ stateVersion: 999 }, null)).to.deep.equal(migrateState({}, null));
  });
});

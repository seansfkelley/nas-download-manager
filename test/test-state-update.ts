import "mocha";
import { expect } from "chai";
import { cloneDeep } from "lodash";
import type { DownloadStationTask } from "synology-typescript-api";

import { updateStateToLatest } from "../src/common/state/update";
import type { State as State_1 } from "../src/common/state/1";
import type { State as State_2 } from "../src/common/state/2";
import type { State as State_3 } from "../src/common/state/3";
import type { State as State_4 } from "../src/common/state/4";
import type { State as State_5 } from "../src/common/state/5";

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

function testTranstion<T>(before: T, after: State_5) {
  const originalBefore = cloneDeep(before);
  const transitioned = updateStateToLatest(before);

  expect(before).to.not.deep.equal(after);
  expect(before).to.deep.equal(originalBefore);
  expect(transitioned).to.deep.equal(after);
}

describe("state versioning", () => {
  it("should update to the latest version from pre-version 0", () => {
    testTranstion<PreVersioningState_0>(
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
          torrentTrackers: {
            enablePublicTrackers: false,
            publicTrackerURL: ""
          },
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
        },

        tasks: [],
        taskFetchFailureReason: null,
        tasksLastCompletedFetchTimestamp: null,
        tasksLastInitiatedFetchTimestamp: null,
        lastSevereError: undefined,
        stateVersion: 5,
      },
    );
  });

  it("should update to the latest version from pre-version 1", () => {
    testTranstion<PreVersioningState_1>(
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
          torrentTrackers: {
            enablePublicTrackers: false,
            publicTrackerURL: ""
          },
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
        },

        tasks: [],
        taskFetchFailureReason: null,
        tasksLastCompletedFetchTimestamp: null,
        tasksLastInitiatedFetchTimestamp: null,
        lastSevereError: undefined,
        stateVersion: 5,
      },
    );
  });

  it("should update to the latest version with a degenerate tasks-only state", () => {
    testTranstion<{ tasks: unknown[] }>(
      { tasks: [] },
      {
        settings: {
          connection: {
            protocol: "https",
            hostname: "",
            port: 5001,
            username: "",
            password: "",
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
          torrentTrackers: {
            enablePublicTrackers: false,
            publicTrackerURL: ""
          },
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
        },

        tasks: [],
        taskFetchFailureReason: null,
        tasksLastCompletedFetchTimestamp: null,
        tasksLastInitiatedFetchTimestamp: null,
        lastSevereError: undefined,
        stateVersion: 5,
      },
    );
  });

  it("should update to the latest version from version 0 (no state)", () => {
    testTranstion<null>(null, {
      settings: {
        connection: {
          protocol: "https",
          hostname: "",
          port: 5001,
          username: "",
          password: "",
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
        torrentTrackers: {
          enablePublicTrackers: false,
          publicTrackerURL: ""
        },
        shouldHandleDownloadLinks: true,
        taskSortType: "name-asc",
        badgeDisplayType: "total",
      },
      tasks: [],
      taskFetchFailureReason: null,
      tasksLastCompletedFetchTimestamp: null,
      tasksLastInitiatedFetchTimestamp: null,
      lastSevereError: undefined,
      stateVersion: 5,
    });
  });

  it("should update to the latest version from version 1 and unset task data and metadata", () => {
    testTranstion<State_1>(
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
        torrentTrackers: {
          enablePublicTrackers: false,
          publicTrackerURL: ""
        },
        shouldHandleDownloadLinks: true,
        stateVersion: 1,
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
          torrentTrackers: {
            enablePublicTrackers: false,
            publicTrackerURL: ""
          },
          shouldHandleDownloadLinks: true,
          taskSortType: "name-asc",
          badgeDisplayType: "total",
        },
        tasks: [],
        taskFetchFailureReason: null,
        tasksLastCompletedFetchTimestamp: null,
        tasksLastInitiatedFetchTimestamp: null,
        lastSevereError: undefined,
        stateVersion: 5,
      },
    );
  });

  it("should update to the latest version from version 2", () => {
    testTranstion<State_2>(
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
        torrentTrackers: {
          enablePublicTrackers: false,
          publicTrackerURL: ""
        },
        shouldHandleDownloadLinks: true,
        lastSevereError: new Error(),
        stateVersion: 2,
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
          torrentTrackers: {
            enablePublicTrackers: false,
            publicTrackerURL: ""
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
    );
  });

  it("should update to the latest version from an erroneous version 2 missing fields", () => {
    testTranstion<Omit<State_2, "taskSortType" | "shouldHandleDownloadLinks">>(
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
        torrentTrackers: {
          enablePublicTrackers: false,
          publicTrackerURL: ""
        },
        lastSevereError: new Error(),
        stateVersion: 2,
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
          torrentTrackers: {
            enablePublicTrackers: false,
            publicTrackerURL: ""
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
    );
  });

  it("should add badgeDisplayType when upgrading from 3 to 4", () => {
    testTranstion<State_3>(
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
        torrentTrackers: {
          enablePublicTrackers: false,
          publicTrackerURL: ""
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
          torrentTrackers: {
            enablePublicTrackers: false,
            publicTrackerURL: ""
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
    );
  });

  it("should inline settings when upgrading from 4 to 5", () => {
    testTranstion<State_4>(
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
        torrentTrackers: {
          enablePublicTrackers: false,
          publicTrackerURL: ""
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
          torrentTrackers: {
            enablePublicTrackers: false,
            publicTrackerURL: ""
          },
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

  it("should do nothing when the state is already latest", () => {
    const before: State_5 = {
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
        torrentTrackers: {
          enablePublicTrackers: false,
          publicTrackerURL: ""
        },
        shouldHandleDownloadLinks: true,
      },
      tasks: [DUMMY_TASK],
      taskFetchFailureReason: "missing-config",
      tasksLastCompletedFetchTimestamp: 0,
      tasksLastInitiatedFetchTimestamp: 0,
      lastSevereError: undefined,
      stateVersion: 5,
    };

    expect(updateStateToLatest(before)).to.equal(before);
  });

  it("should throw an error if the state version is too new", () => {
    expect(() => updateStateToLatest({ stateVersion: 999 })).to.throw("cannot downgrade");
  });
});

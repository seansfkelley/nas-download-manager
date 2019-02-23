import "mocha";
import { expect } from "chai";

import { DownloadStationTask } from "synology-typescript-api";
import { Omit } from "../src/common/lang";
import { updateStateToLatest } from "../src/common/state/update";
import { State_1 } from "../src/common/state/1";
import { State_2 } from "../src/common/state/2";
import { State as LatestState } from "../src/common/state/latest";

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

describe("state versioning", () => {
  it("should update to the latest version from pre-version 0", () => {
    const before: PreVersioningState_0 = {
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
    };

    const after: LatestState = {
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
      tasks: [],
      taskFetchFailureReason: null,
      tasksLastCompletedFetchTimestamp: null,
      tasksLastInitiatedFetchTimestamp: null,
      lastSevereError: undefined,
      stateVersion: 3,
    };

    expect(updateStateToLatest(before)).to.not.equal(before);
    expect(updateStateToLatest(before)).to.deep.equal(after);
  });

  it("should update to the latest version from pre-version 1", () => {
    const before: PreVersioningState_1 = {
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
      taskSortType: "completed-percent-asc",
      tasks: [DUMMY_TASK],
      taskFetchFailureReason: "missing-config",
      tasksLastCompletedFetchTimestamp: 0,
      tasksLastInitiatedFetchTimestamp: 0,
      shouldHandleDownloadLinks: true,
      cachedTasksVersion: 0,
    };

    const after: LatestState = {
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
      taskSortType: "completed-percent-asc",
      tasks: [],
      taskFetchFailureReason: null,
      tasksLastCompletedFetchTimestamp: null,
      tasksLastInitiatedFetchTimestamp: null,
      lastSevereError: undefined,
      stateVersion: 3,
    };

    expect(updateStateToLatest(before)).to.not.equal(before);
    expect(updateStateToLatest(before)).to.deep.equal(after);
  });

  it("should update to the latest version with a degenerate tasks-only state", () => {
    const after: LatestState = {
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
      shouldHandleDownloadLinks: true,
      taskSortType: "name-asc",
      tasks: [],
      taskFetchFailureReason: null,
      tasksLastCompletedFetchTimestamp: null,
      tasksLastInitiatedFetchTimestamp: null,
      lastSevereError: undefined,
      stateVersion: 3,
    };

    expect(updateStateToLatest({ tasks: [] })).to.deep.equal(after);
  });

  it("should update to the latest version from version 0 (no state)", () => {
    const after: LatestState = {
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
      shouldHandleDownloadLinks: true,
      taskSortType: "name-asc",
      tasks: [],
      taskFetchFailureReason: null,
      tasksLastCompletedFetchTimestamp: null,
      tasksLastInitiatedFetchTimestamp: null,
      lastSevereError: undefined,
      stateVersion: 3,
    };

    expect(updateStateToLatest(null)).to.deep.equal(after);
  });

  it("should update to the latest version from version 1", () => {
    const before: State_1 = {
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
      taskSortType: "completed-percent-asc",
      tasks: [DUMMY_TASK],
      taskFetchFailureReason: "missing-config",
      tasksLastCompletedFetchTimestamp: 0,
      tasksLastInitiatedFetchTimestamp: 0,
      shouldHandleDownloadLinks: true,
      stateVersion: 1,
    };

    const after: LatestState = {
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
      taskSortType: "completed-percent-asc",
      tasks: [],
      taskFetchFailureReason: null,
      tasksLastCompletedFetchTimestamp: null,
      tasksLastInitiatedFetchTimestamp: null,
      lastSevereError: undefined,
      stateVersion: 3,
    };

    expect(updateStateToLatest(before)).to.not.equal(before);
    expect(updateStateToLatest(before)).to.deep.equal(after);
  });

  it("should update to the latest version from version 2", () => {
    const before: State_2 = {
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
      taskSortType: "completed-percent-asc",
      tasks: [DUMMY_TASK],
      taskFetchFailureReason: "missing-config",
      tasksLastCompletedFetchTimestamp: 0,
      tasksLastInitiatedFetchTimestamp: 0,
      shouldHandleDownloadLinks: true,
      lastSevereError: new Error(),
      stateVersion: 2,
    };

    const after: LatestState = {
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
      taskSortType: "completed-percent-asc",
      tasks: [DUMMY_TASK],
      taskFetchFailureReason: "missing-config",
      tasksLastCompletedFetchTimestamp: 0,
      tasksLastInitiatedFetchTimestamp: 0,
      lastSevereError: undefined,
      stateVersion: 3,
    };

    expect(updateStateToLatest(before)).to.not.equal(before);
    expect(updateStateToLatest(before)).to.deep.equal(after);
  });

  it("should update to the latest version from an erroneous version 2 missing fields", () => {
    const before: Omit<State_2, "taskSortType" | "shouldHandleDownloadLinks"> = {
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
    };

    const after: LatestState = {
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
    };

    expect(updateStateToLatest(before)).to.not.equal(before);
    expect(updateStateToLatest(before)).to.deep.equal(after);
  });

  it("should do nothing when the state is already latest", () => {
    const before: LatestState = {
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
      tasks: [DUMMY_TASK],
      taskFetchFailureReason: "missing-config",
      tasksLastCompletedFetchTimestamp: 0,
      tasksLastInitiatedFetchTimestamp: 0,
      shouldHandleDownloadLinks: true,
      lastSevereError: undefined,
      stateVersion: 3,
    };

    expect(updateStateToLatest(before)).to.equal(before);
  });

  it("should throw an error if the state version is too new", () => {
    expect(() => updateStateToLatest({ stateVersion: 999 })).to.throw("cannot downgrade");
  });
});

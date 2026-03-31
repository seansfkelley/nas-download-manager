import "mocha";
import { expect } from "chai";

import { loadState } from "../src/common/state/migrate";
import { DEFAULT_STATE, STATE_VERSION } from "../src/common/state/defaults";
import type { State } from "../src/common/state/defaults";

describe("state loading", () => {
  it("should return defaults for null state", () => {
    const result = loadState(null);
    expect(result).to.deep.equal(DEFAULT_STATE);
    expect(result).to.not.equal(DEFAULT_STATE);
  });

  it("should return defaults for undefined state", () => {
    expect(loadState(undefined)).to.deep.equal(DEFAULT_STATE);
  });

  it("should return defaults for empty object", () => {
    expect(loadState({})).to.deep.equal(DEFAULT_STATE);
  });

  it("should return defaults for wrong version", () => {
    expect(loadState({ stateVersion: 999 })).to.deep.equal(DEFAULT_STATE);
  });

  it("should return defaults for old version", () => {
    expect(loadState({ stateVersion: 0 })).to.deep.equal(DEFAULT_STATE);
  });

  it("should preserve stored values when version matches", () => {
    const stored: State = {
      ...DEFAULT_STATE,
      stateVersion: STATE_VERSION,
      settings: {
        ...DEFAULT_STATE.settings,
        connection: {
          hostname: "mynas.local",
          port: 5001,
          username: "admin",
          password: "secret",
          rememberPassword: true,
        },
        visibleTasks: {
          downloading: true,
          uploading: false,
          completed: true,
          errored: false,
          other: true,
        },
        taskSortType: "name-desc",
      },
    };

    const result = loadState(stored);
    expect(result.settings.connection.hostname).to.equal("mynas.local");
    expect(result.settings.connection.username).to.equal("admin");
    expect(result.settings.visibleTasks.uploading).to.equal(false);
    expect(result.settings.taskSortType).to.equal("name-desc");
  });

  it("should fill in missing settings with defaults", () => {
    const stored = {
      stateVersion: STATE_VERSION,
      settings: {
        connection: {
          hostname: "mynas.local",
          port: 5001,
        },
      },
    };

    const result = loadState(stored);
    expect(result.settings.connection.hostname).to.equal("mynas.local");
    expect(result.settings.connection.username).to.equal("");
    expect(result.settings.connection.rememberPassword).to.equal(true);
    expect(result.settings.visibleTasks).to.deep.equal(DEFAULT_STATE.settings.visibleTasks);
    expect(result.settings.notifications).to.deep.equal(DEFAULT_STATE.settings.notifications);
    expect(result.settings.shouldHandleDownloadLinks).to.equal(true);
    expect(result.settings.badgeDisplayType).to.equal("total");
    expect(result.settings.showInactiveTasks).to.equal(true);
  });

  it("should fill in missing top-level fields with defaults", () => {
    const stored = {
      stateVersion: STATE_VERSION,
      settings: DEFAULT_STATE.settings,
    };

    const result = loadState(stored);
    expect(result.tasks).to.deep.equal([]);
    expect(result.taskFetchFailureReason).to.equal("missing-config");
    expect(result.tasksLastInitiatedFetchTimestamp).to.equal(null);
    expect(result.tasksLastCompletedFetchTimestamp).to.equal(null);
  });

  it("should not mutate the input", () => {
    const stored = {
      stateVersion: STATE_VERSION,
      settings: {
        connection: { hostname: "mynas.local", port: 5001 },
      },
    };
    const originalStored = structuredClone(stored);

    loadState(stored);
    expect(stored).to.deep.equal(originalStored);
  });

  it("should return identical reference for already-current full state", () => {
    const stored: State = { ...DEFAULT_STATE };
    const result = loadState(stored);
    // Result should deep-equal but be a new object (spread creates new)
    expect(result).to.deep.equal(DEFAULT_STATE);
  });
});

declare var browser: any;

import 'mocha';
import { expect } from 'chai';

import { DownloadStationTask } from 'synology-typescript-api';
import { updateStateShapeIfNecessary } from '../src/common/state';
import { state0to1, State_1 } from '../src/common/state/1';
import { state1to2, State_2 } from '../src/common/state/2';

interface PreVersioningState_0 {
  connection: {
    protocol: 'http' | 'https';
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
  taskFetchFailureReason: 'missing-config' | { failureMessage: string } | null;
  tasksLastInitiatedFetchTimestamp: number | null;
  tasksLastCompletedFetchTimestamp: number | null;
}

interface PreVersioningState_1 extends PreVersioningState_0 {
  taskSortType: 'name-asc' | 'name-desc' | 'timestamp-completed-asc' | 'timestamp-completed-desc' | 'timestamp-added-asc' | 'timestamp-added-desc' | 'completed-percent-asc' | 'completed-percent-desc';
  shouldHandleDownloadLinks: boolean;
  cachedTasksVersion?: number;
}

// TODO: Interface for incorrect-version-2-with-missing-properties?

describe('state versioning', () => {
  it('should update to the latest version from pre-version 0', () => {
    const before: PreVersioningState_0 = {

    };
  });

  it('should update to the latest version from pre-version 1', () => {
  });

  it('should update to the latest version from version 0 (no state)', () => {
  });

  it('should update to the latest version from version 1', () => {
  });

  it('should update to the latest version from version 2', () => {
  });

  it('should do nothing when the state is already version 3', () => {
  });

});

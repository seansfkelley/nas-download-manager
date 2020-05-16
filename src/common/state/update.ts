import type { State, StateVersion } from "./latest";
import { transition as state0to1 } from "./1";
import { transition as state1to2 } from "./2";
import { transition as state2to3 } from "./3";
import { transition as state3to4 } from "./4";
import { transition as state4to5 } from "./5";

const LATEST_STATE_VERSION: StateVersion["stateVersion"] = 5;
const STATE_TRANSFORMS: ((state: any) => any)[] = [
  state0to1,
  state1to2,
  state2to3,
  state3to4,
  state4to5,
];

interface AnyStateVersion {
  stateVersion: number;
}

function isVersioned(state: any): state is AnyStateVersion {
  return state && (state as AnyStateVersion).stateVersion != null;
}

function getStartingVersion(state: any) {
  if (state == null) {
    return 0;
  } else if (isVersioned(state)) {
    return state.stateVersion;
  } else if (state.tasks != null) {
    // state.tasks existing is implicitly the same as version 1 because version 1 was the shape
    // of the state when this more-formal system was created. state.tasks is a good value to check
    // because it is very likely to exist. If it doesn't, the user never successfully logged in
    // and it's probably fine to wipe their state clean.
    return 1;
  } else {
    return 0;
  }
}

export function updateStateToLatest(state: any | null): State {
  const version = getStartingVersion(state);

  if (version > LATEST_STATE_VERSION) {
    throw new Error(`cannot downgrade state shape from ${version} to ${LATEST_STATE_VERSION}`);
  }

  STATE_TRANSFORMS.slice(version).forEach((transform) => {
    state = transform(state);
  });

  return state;
}

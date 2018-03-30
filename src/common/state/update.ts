import { State, StateVersion } from './latest';
import { state0to1 } from './1';
import { state1to2 } from './2';

const LATEST_STATE_VERSION: StateVersion['stateVersion'] = 2;

interface AnyStateVersion {
  stateVersion: number;
}

function isVersioned(state: any): state is AnyStateVersion {
  return state && (state as AnyStateVersion).stateVersion != null;
}

const STATE_TRANSFORMS: ((state: any) => any)[] = [
  state0to1,
  state1to2,
];

export function updateStateToLatest(state: any | null): State {
  function getStartingVersion() {
    if (state == null) {
      return 0;
    } else if (isVersioned(state)) {
      if (state.stateVersion == null) {
        return 0;
      } else {
        return state.stateVersion;
      }
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

  const version = getStartingVersion();

  if (version > LATEST_STATE_VERSION) {
    throw new Error(`cannot downgrade state shape from ${version} to ${LATEST_STATE_VERSION}`);
  }

  STATE_TRANSFORMS.slice(version).forEach((transform, i) => {
    console.log(`updating state shape to version ${i + version + 1}`);
    state = transform(state);
  });

  return state;
}

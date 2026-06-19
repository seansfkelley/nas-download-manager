import type { State, StateVersion } from "./latest";
import { migrate as migrate0to1 } from "./1";
import { migrate as migrate1to2 } from "./2";
import { migrate as migrate2to3 } from "./3";
import { migrate as migrate3to4 } from "./4";
import { migrate as migrate4to5 } from "./5";
import { migrate as migrate5to6 } from "./6";
import { migrate as migrate6to7 } from "./7";
import { migrate as migrate7to8 } from "./8";

const LATEST_STATE_VERSION: StateVersion["stateVersion"] = 8;
const MIGRATIONS: ((state: any) => any)[] = [
  migrate0to1,
  migrate1to2,
  migrate2to3,
  migrate3to4,
  migrate4to5,
  migrate5to6,
  migrate6to7,
  migrate7to8,
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

export function migrateState(state: any | null): State {
  let version = getStartingVersion(state);

  if (version > LATEST_STATE_VERSION) {
    // If the user has downgraded the extension for some reason, throw out their state. There isn't
    // _that_ much of it, and they should already be preparing for extra work by virtue of going out
    // of their way to downgrade it.
    version = 0;
  }

  MIGRATIONS.slice(version).forEach((migration) => {
    state = migration(state);
  });

  return state;
}

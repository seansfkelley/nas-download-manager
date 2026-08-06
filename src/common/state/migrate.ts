import { ALL_STORED_STATE_NAMES, type State } from "./migrations/latest";
import { LATEST_STATE_VERSION, migrateState } from "./migrations/update";

// Bypasses State.get, which would lie to the typechecker: what is on disk here is whatever shape
// the version that wrote it used.
export async function migrateStoredState() {
  const stored = await browser.storage.local.get(null);
  if (stored.stateVersion === LATEST_STATE_VERSION) {
    return;
  }

  await browser.storage.local.set(migrateState(stored));

  // Not a clear() before the write, which would leave the profile empty if anything between the two
  // failed. Removing afterwards means the worst case is a few dead keys nobody reads.
  const abandoned = Object.keys(stored).filter(
    (key) => !ALL_STORED_STATE_NAMES.includes(key as keyof State),
  );
  if (abandoned.length > 0) {
    await browser.storage.local.remove(abandoned);
  }
}

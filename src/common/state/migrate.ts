import { ALL_STORED_STATE_NAMES, type PersistentState } from "./migrations/latest";
import { LATEST_STATE_VERSION, migrateState } from "./migrations/update";

export async function migratePersistentState() {
  const stored = await browser.storage.local.get(null);
  if (stored.stateVersion === LATEST_STATE_VERSION) {
    return;
  }

  await browser.storage.local.set(migrateState(stored));

  // Don't clear() to be safe. Selectively remove dead keys so if something happens, in the worst
  // case, that data is merely abandoned rather than accidentally clearing everything without
  // replacement.
  const abandoned = Object.keys(stored).filter(
    (key) => !ALL_STORED_STATE_NAMES.includes(key as keyof PersistentState),
  );
  if (abandoned.length > 0) {
    await browser.storage.local.remove(abandoned);
  }
}

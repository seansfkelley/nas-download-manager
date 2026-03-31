import type { State } from "./defaults";
import { DEFAULT_STATE, STATE_VERSION } from "./defaults";

export async function maybeMigrateState() {
  const updated = loadState(await browser.storage.local.get(null));
  await browser.storage.local.clear();
  return browser.storage.local.set(updated);
}

export function loadState(stored: unknown): State {
  const s = stored as Record<string, unknown> | null | undefined;
  if (!s || s.stateVersion !== STATE_VERSION) {
    return { ...DEFAULT_STATE };
  }
  const settings = s.settings as Record<string, unknown> | undefined;
  return {
    ...DEFAULT_STATE,
    ...(s as Partial<State>),
    settings: {
      ...DEFAULT_STATE.settings,
      ...settings,
      connection: { ...DEFAULT_STATE.settings.connection, ...(settings?.connection as object) },
      visibleTasks: {
        ...DEFAULT_STATE.settings.visibleTasks,
        ...(settings?.visibleTasks as object),
      },
      notifications: {
        ...DEFAULT_STATE.settings.notifications,
        ...(settings?.notifications as object),
      },
    },
  };
}

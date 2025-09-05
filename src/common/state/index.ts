import type { ConnectionSettings, State } from "./migrations/latest";
import { migrateState } from "./migrations/update";
import { typesafeMapValues } from "../lang";

export * from "./constants";
export * from "./listen";
export * from "./migrations/latest";

export function getHostUrl(settings: ConnectionSettings) {
  if (settings.hostname && settings.port) {
    return `https://${settings.hostname}:${settings.port}`;
  } else {
    return undefined;
  }
}

export async function maybeMigrateState() {
  const updated = migrateState(await browser.storage.local.get<any>(null), null);
  await browser.storage.local.clear();
  return browser.storage.local.set<State>(updated);
}

export function redactState(state: State): object {
  const sanitizedConnection: Record<keyof ConnectionSettings, boolean> = {
    ...typesafeMapValues(state.settings.connection, Boolean),
  };

  return {
    ...state,
    settings: {
      ...state.settings,
      connection: sanitizedConnection,
    },
    lastSevereError: state.lastSevereError ? "(omitted for brevity)" : undefined,
    tasks: state.tasks.length,
  };
}

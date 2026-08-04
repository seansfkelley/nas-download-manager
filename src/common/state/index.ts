import type { Protocol, ConnectionSettings, State } from "./migrations/latest";
import { migrateState } from "./migrations/update";
import { typesafeMapValues } from "../lang";

export * from "./constants";
export * from "./listen";
export * from "./migrations/latest";

export function getHostUrl(settings: ConnectionSettings) {
  if (settings.protocol && settings.hostname && settings.port) {
    return `${settings.protocol}://${settings.hostname}:${settings.port}`;
  } else {
    return undefined;
  }
}

export async function maybeMigrateState() {
  const updated = migrateState(await browser.storage.local.get<any>(null));
  await browser.storage.local.clear();
  return browser.storage.local.set<State>(updated);
}

export function redactState(state: State): object {
  const sanitizedConnection: Record<keyof ConnectionSettings, boolean | Protocol> = {
    ...typesafeMapValues(state.settings.connection, Boolean),
    protocol: state.settings.connection.protocol,
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

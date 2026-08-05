import { type Protocol, type ConnectionSettings, State } from "./migrations/latest";
import { migrateState } from "./migrations/update";
import { typesafeMapValues } from "../lang";

export * from "./constants";
export * from "./listen";
export * from "./migrations/latest";
// Named explicitly because the wildcard above silently drops it. Parcel drops namespaces from
// wildcard exports for some reason, and we use namespace merging for ergonomics.
export { State } from "./migrations/latest";

export function getHostUrl(settings: ConnectionSettings) {
  if (settings.protocol && settings.hostname && settings.port) {
    return `${settings.protocol}://${settings.hostname}:${settings.port}`;
  } else {
    return undefined;
  }
}

export async function maybeMigrateState() {
  // Deliberately not getStoredState: this reads the pre-migration contents, whose shape is whatever
  // an older version of the extension last wrote, and is not yet a State.
  const updated = migrateState(await browser.storage.local.get(null));
  await browser.storage.local.clear();
  return State.set(updated);
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

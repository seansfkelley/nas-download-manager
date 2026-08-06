import type { Protocol, ConnectionSettings, Settings } from "./migrations/latest";
import { typesafeMapValues } from "../lang";

export * from "./constants";
export * from "./listen";
export * from "./migrate";
export * from "./migrations/latest";
export * from "./session";
// Named explicitly because the wildcards above silently drop them. Parcel drops namespaces from
// wildcard exports for some reason, and we use namespace merging for ergonomics.
export { PersistentState } from "./migrations/latest";
export { SessionState } from "./session";

export function getHostUrl(settings: ConnectionSettings) {
  if (settings.protocol && settings.hostname && settings.port) {
    return `${settings.protocol}://${settings.hostname}:${settings.port}`;
  } else {
    return undefined;
  }
}

// Settings alone, because that is all the persistent state has that a bug report can use. The error
// itself is printed alongside this, and the version is always the current one by the time anything
// can read it.
export function redactSettings(settings: Settings): object {
  const sanitizedConnection: Record<keyof ConnectionSettings, boolean | Protocol> = {
    ...typesafeMapValues(settings.connection, Boolean),
    protocol: settings.connection.protocol,
  };

  return {
    ...settings,
    connection: sanitizedConnection,
  };
}

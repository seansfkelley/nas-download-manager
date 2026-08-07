import { type ConnectionSettings, Settings } from "./migrations/latest";
import { typesafeMapValues } from "../lang";

export * from "./constants";
export * from "./listen";
export * from "./session";
export * from "./migrations/latest";
// Named explicitly because the wildcard above silently drops it. Parcel drops namespaces from
// wildcard exports for some reason, and we use namespace merging for ergonomics.
export { PersistentState } from "./migrations/latest";

export function getHostUrl(settings: ConnectionSettings) {
  if (settings.protocol && settings.hostname && settings.port) {
    return `${settings.protocol}://${settings.hostname}:${settings.port}`;
  } else {
    return undefined;
  }
}

export function redactSettings(settings: Settings): object {
  const sanitizedConnection = {
    ...typesafeMapValues(settings.connection, Boolean),
    protocol: settings.connection.protocol,
  };

  return {
    ...settings,
    connection: sanitizedConnection,
  };
}

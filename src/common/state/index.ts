import { typesafeMapValues } from "../lang";

import { type ConnectionSettings, Settings } from "./migrations/latest";

export * from "./constants";
export * from "./listen";
export * from "./SessionState";
export * from "./PersistentState";
export * from "./migrations/latest";

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

import { type Protocol, type ConnectionSettings, State } from "./migrations/latest";
import { typesafeMapValues } from "../lang";

export * from "./constants";
export * from "./listen";
export * from "./migrate";
export * from "./migrations/latest";
export * from "./session";
// Named explicitly because the wildcards above silently drop them. Parcel drops namespaces from
// wildcard exports for some reason, and we use namespace merging for ergonomics.
export { State } from "./migrations/latest";
export { SessionState } from "./session";

export function getHostUrl(settings: ConnectionSettings) {
  if (settings.protocol && settings.hostname && settings.port) {
    return `${settings.protocol}://${settings.hostname}:${settings.port}`;
  } else {
    return undefined;
  }
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

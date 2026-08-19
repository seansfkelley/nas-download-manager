import { typesafeMapValues } from "../lang";

import { type ConnectionIdentifiers, Settings } from "./migrations/latest";

export * from "./constants";
export * from "./listen";
export * from "./SessionState";
export * from "./PersistentState";
export * from "./migrations/latest";

export function getHostUrl({ protocol, hostname, port }: ConnectionIdentifiers) {
  if (protocol && hostname && port) {
    return `${protocol}://${hostname}:${port}`;
  } else {
    return undefined;
  }
}

export function redactSettings(settings: Settings): object {
  const { identifiers, secrets, rememberSecrets } = settings.connection;

  return {
    ...settings,
    connection: {
      identifiers: {
        ...typesafeMapValues(identifiers, Boolean),
        protocol: identifiers.protocol,
      },
      secrets: secrets && typesafeMapValues(secrets, Boolean),
      rememberSecrets,
    },
  };
}

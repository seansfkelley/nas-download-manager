import type { ConnectionSettings, State, Settings } from "./migrations/latest";
import { migrateState } from "./migrations/update";
import { typesafeMapValues } from "../lang";
import type { Downloads } from "../apis/messages";

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
  const updated = migrateState(await browser.storage.local.get<any>(null));
  await browser.storage.local.clear();
  return browser.storage.local.set<State>(updated);
}

export function redactState(settings?: Settings, downloads?: Downloads): object {
  const redacted: { settings?: object; downloads?: object } = {};

  if (settings) {
    redacted.settings = {
      ...settings,
      connection: typesafeMapValues(settings.connection, Boolean),
    };
  }

  if (downloads) {
    redacted.downloads = {
      ...downloads,
      tasks: downloads.tasks.length,
    };
  }

  return redacted;
}

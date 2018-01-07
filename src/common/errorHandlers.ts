import { Logging } from './state';

export function onUnhandledError(e: any | undefined) {
  console.error("unhandled error", e);
  const logging: Logging = {
    lastSevereError: e,
  };
  browser.storage.local.set(logging);
}

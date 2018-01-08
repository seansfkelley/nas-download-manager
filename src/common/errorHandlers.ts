import { Logging } from './state';

export function onUnhandledError(e: any | undefined) {
  console.error("unhandled error", e);
  let formattedError = e != null
    ? `${e.name || '(no error name)'}: '${e.message || '(no error message)'}'
${e.stack ? 'Error stack trace: ' + e.stack.trim() : '(no error stack)'}`
    : 'unknown error';

  const logging: Logging = {
    lastSevereError: formattedError,
  };
  browser.storage.local.set(logging);
}

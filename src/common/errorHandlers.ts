import type { Logging, State } from "./state";

export function onUnhandledError(e: any | undefined, message?: string) {
  console.error(message || "unhandled error", e);
  let formattedError =
    e != null
      ? `${e.name || "(no error name)"}: '${e.message || "(no error message)"}'
${e.stack ? "Error stack trace: " + e.stack.trim() : "(no error stack)"}`
      : "unknown error";

  if (message) {
    formattedError = `${message}\n\n${formattedError}`;
  }

  const logging: Logging = {
    lastSevereError: formattedError,
  };
  browser.storage.local.set<Partial<State>>(logging);
}

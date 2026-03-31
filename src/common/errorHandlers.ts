export function setupGlobalErrorHandler() {
  globalThis.addEventListener("error", (e) => {
    e.preventDefault();
    saveLastSevereError(e.error);
  });
}

export function saveLastSevereError(e: unknown, message?: string) {
  console.error(message || "unhandled error", e);
  const err = e instanceof Error ? e : null;
  let formattedError =
    e != null
      ? `${err?.name || "(no error name)"}: '${err?.message || "(no error message)"}'
${err?.stack ? "Error stack trace: " + err.stack.trim() : "(no error stack)"}`
      : "unknown error";

  if (message) {
    formattedError = `${message}\n\n${formattedError}`;
  }

  formattedError = `Error generated at ${new Date().toLocaleString()}\n\n${formattedError}`;

  const logging: Pick<import("./state/defaults").State, "lastSevereError"> = {
    lastSevereError: formattedError,
  };
  browser.storage.local.set(logging);
}

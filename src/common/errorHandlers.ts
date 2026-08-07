import { PersistentState } from "./state";

export function saveLastSevereError(e: any | undefined, message?: string) {
  console.error(message || "unhandled error", e);
  let formattedError =
    e != null
      ? `${e.name || "(no error name)"}: '${e.message || "(no error message)"}'
${e.stack ? "Error stack trace: " + e.stack.trim() : "(no error stack)"}`
      : "unknown error";

  if (message) {
    formattedError = `${message}\n\n${formattedError}`;
  }

  formattedError = `Error generated at ${new Date().toLocaleString()}\n\n${formattedError}`;

  PersistentState.set({ lastSevereError: formattedError });
}

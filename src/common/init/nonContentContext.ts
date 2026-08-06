import { saveLastSevereError } from "../errorHandlers";

// self rather than window, which does not exist in a background service worker.

// TODO: When browser support this natively or Bluebird starts working again.
// self.addEventListener('unhandledrejection', (e: any) => {
//   e.preventDefault();
//   onUnhandledError(e && e.detail && e.detail.reason);
// });

self.addEventListener("error", (e) => {
  e.preventDefault();
  saveLastSevereError(e.error);
});

import { saveLastSevereError } from "../errorHandlers";

// TODO: When browser support this natively or Bluebird starts working again.
// self.addEventListener('unhandledrejection', (e: any) => {
//   e.preventDefault();
//   onUnhandledError(e && e.detail && e.detail.reason);
// });

// `self`, not `window`: this also runs in the background service worker.
self.addEventListener("error", (e) => {
  e.preventDefault();
  saveLastSevereError(e.error);
});

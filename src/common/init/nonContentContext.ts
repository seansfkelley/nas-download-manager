import { saveLastSevereError } from "../errorHandlers";

// `self`, not `window`: this module is also imported by the background service worker.
self.addEventListener("error", (e) => {
  e.preventDefault();
  saveLastSevereError(e.error);
});

self.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  saveLastSevereError(e.reason);
});

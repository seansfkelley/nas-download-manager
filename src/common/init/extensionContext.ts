import './sharedContext';

import { onUnhandledError } from '../errorHandlers';

// TODO: When browser support this natively or Bluebird starts working again.
// window.addEventListener('unhandledrejection', (e: any) => {
//   e.preventDefault();
//   onUnhandledError(e && e.detail && e.detail.reason);
// });

window.addEventListener('error', e => {
  e.preventDefault();
  onUnhandledError(e.error);
});


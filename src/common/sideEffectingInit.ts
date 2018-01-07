import 'chrome-extension-async';
(window as any).browser = (window as any).browser || (window as any).chrome;

// I don't include typings because I'm only including Bluebird for the unhandled-rejection behavior.
// I want to build against ES6 Promise, which works great except for the lack of that handler.
import * as Bluebird from 'bluebird';
(window as any).Promise = Bluebird;

import { onUnhandledError } from './errorHandlers';

window.addEventListener('unhandledrejection', (e: any) => onUnhandledError(e && e.detail && e.detail.reason));
window.addEventListener('error', onUnhandledError);


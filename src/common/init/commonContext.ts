// This require is resolved by the bundler, not by Node, and @types/node no longer declares a
// global `require`. The polyfill (and this whole module) goes away once Chrome's native `browser`
// namespace is relied on directly.
declare const require: (id: string) => unknown;

(window as any).browser = require("webextension-polyfill");

import { assert } from "../../common/lang";

export type ListenerType = "settings" | "downloads";

export interface Listener {
  (): void;
  listenTo: ListenerType[];
}

const listeners: Record<ListenerType, Listener[]> = {
  settings: [],
  downloads: [],
};

export function registerListener(l: Listener) {
  assert(l.listenTo.length > 0);
  l.listenTo.forEach((t) => listeners[t].push(l));
}

export function notifyListeners(type: ListenerType) {
  listeners[type].forEach((l) => l());
}

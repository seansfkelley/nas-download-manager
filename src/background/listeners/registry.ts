export type Listener = () => void;

const settingsListeners: Listener[] = [];
const downloadsListeners: Listener[] = [];

export function registerSettingsChangeListener(listener: Listener) {
  settingsListeners.push(listener);
}

export function registerDownloadsChangeListener(listener: Listener) {
  downloadsListeners.push(listener);
}

export function notifySettingsChanged() {
  settingsListeners.forEach((l) => l());
}

export function notifyDownloadsChanged() {
  downloadsListeners.forEach((l) => l());
}

import 'chrome-extension-async';

export function shimExtensionApi() {
  (window as any).browser = (window as any).browser || (window as any).chrome;
}

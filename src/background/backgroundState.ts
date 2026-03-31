import { SynologyClient } from "../common/apis/synology/client";
import type { NotificationSettings } from "../common/state/defaults";

export interface RequestToken {
  __requestTokenBrand: unknown;
}

// Staleness guard for pollTasks. Since polling can be triggered from many places
// (alarms, state changes, user actions), multiple polls may be in-flight simultaneously.
// Each call gets a token; when the response arrives, we check if a newer poll was started
// in the meantime and discard stale results. AbortController wouldn't help here because
// the NAS processes the request regardless — we only need to avoid overwriting newer data.
export class RequestManager {
  private _token: number = 0;

  public startNewRequest() {
    return ++this._token as unknown as RequestToken;
  }

  public isRequestLatest(token: RequestToken) {
    return (token as unknown as number) === this._token;
  }
}

const SESSION_STORAGE_KEY = "_cache.session";

let resolveSettingsReady: () => void;
export const settingsReady = new Promise<void>((resolve) => {
  resolveSettingsReady = resolve;
});
export { resolveSettingsReady };

export interface BackgroundState {
  api: SynologyClient;
  // This starts undefined, which means we haven't fetched the list of tasks yet.
  finishedTaskIds: Set<string> | undefined;
  pollRequestManager: RequestManager;
  lastNotificationSettings: NotificationSettings | undefined;
  showNonErrorNotifications: boolean;
  isInitializingExtension: boolean;
}

export function clearCachedSession() {
  console.log("[session-cache] clearing cached session");
  return browser.storage.local.remove(SESSION_STORAGE_KEY);
}

const state: BackgroundState = {
  api: new SynologyClient(
    {},
    {
      onSessionChange: (sid, synotoken) => {
        if (sid) {
          console.log("[session-cache] saving sid:", sid.slice(0, 8) + "...");
          browser.storage.local.set({ [SESSION_STORAGE_KEY]: { sid, synotoken } });
        } else {
          console.log("[session-cache] clearing sid (empty)");
          browser.storage.local.remove(SESSION_STORAGE_KEY);
        }
      },
      onSessionClear: () => {
        console.log("[session-cache] clearing (auth error)");
        browser.storage.local.remove(SESSION_STORAGE_KEY);
      },
      loadCachedSession: () =>
        browser.storage.local.get(SESSION_STORAGE_KEY).then((result) => {
          const cached = result[SESSION_STORAGE_KEY] as
            | { sid: string; synotoken: string }
            | undefined;
          console.log(
            "[session-cache] loaded:",
            cached?.sid ? cached.sid.slice(0, 8) + "..." : "empty",
          );
          return cached;
        }),
    },
  ),
  finishedTaskIds: undefined,
  pollRequestManager: new RequestManager(),
  lastNotificationSettings: undefined,
  showNonErrorNotifications: true,
  isInitializingExtension: true,
};

export function getMutableStateSingleton() {
  return state;
}

import type { AuthResult } from "../apis/synology";

// storage.session rather than module scope, because a background context that can be suspended
// loses module scope without warning. Its lifetime -- cleared on browser restart, never written to
// disk -- is exactly what "remember for this session" means.
export interface SessionState {
  // Keyed on the connection it was obtained with, so that changing any of the credentials discards
  // it without anyone having to remember to. Reusing a session against a different DiskStation, or
  // reusing "incorrect password" against a password the user has since fixed, are both wrong, and
  // both are unreachable if the key has to match.
  auth?: { connection: string; result: AuthResult };
  // Only set when "remember password" is off, where the password deliberately never reaches
  // storage.local and would otherwise be lost along with module scope.
  password?: string;
  // An array because Set does not serialize. Absent means no poll has completed yet, which is what
  // keeps the first poll from notifying about everything that finished before we were watching.
  finishedTaskIds?: string[];
  // What the cached tasks were fetched with, so a change of DiskStation can invalidate them.
  cachedTasksConnection?: string;
}

// No versions and no migrations, unlike the persistent state: onInstalled clears the whole area, so
// anything found here was written by the running version.
export namespace SessionState {
  export async function get(): Promise<SessionState> {
    return (await browser.storage.session.get(null)) as SessionState;
  }

  // Partial writes are safe because writers own disjoint keys, so two of them cannot clobber.
  export function set(state: SessionState): Promise<void> {
    return browser.storage.session.set(state);
  }

  export function remove(...keys: (keyof SessionState)[]): Promise<void> {
    return browser.storage.session.remove(keys);
  }

  export function clear(): Promise<void> {
    return browser.storage.session.clear();
  }
}

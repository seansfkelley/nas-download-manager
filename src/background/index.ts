import "../common/init/nonContentContext";
import { migrateStoredState, onStoredStateChange, SessionState } from "../common/state";
import { saveLastSevereError } from "../common/errorHandlers";
import { onStoredStateChange as onStoredStateChangeListener } from "./onStateChange";
import { createContextMenu, initializeContextMenuHandler } from "./contextMenus";
import { initializeAlarmHandler } from "./alarms";
import { initializeMessageHandler } from "./messages";

// Everything here registers its listeners synchronously. A non-persistent background context wakes
// for an event and drops it if nothing is listening by the end of this evaluation.
initializeAlarmHandler();
initializeContextMenuHandler();
initializeMessageHandler();
onStoredStateChange(onStoredStateChangeListener);

browser.runtime.onInstalled.addListener(async () => {
  // The only place stored state is migrated. onInstalled fires on install and on update, which is
  // exactly when the stored shape can change: updating the extension tears every context down, so
  // nothing can be running against one shape while another is written. It does not fire on browser
  // restart or on a background wake, and it does not need to.
  //
  // Everything else -- State.get, State.set, every partial write -- assumes the stored state is
  // already current and casts accordingly. Three known risks come with that, none of them worth
  // more machinery than this:
  //
  // A failed migration is permanent. There is no documented retry for onInstalled, so nothing here
  // gets a second attempt, and every state listener stays silent because the stored shape never
  // becomes one they will accept. That means a blank popup and settings page rather than a broken
  // one, and it takes storage itself failing to get there, since migrateState handles every input.
  //
  // Readers can beat the migration. The initial read in onStoredStateChange above genuinely does:
  // it is kicked off during this same module evaluation, before this listener can fire. It is
  // handled where it happens, by declining to deliver state whose version is not current, and the
  // write below re-delivers to everyone.
  //
  // Writers could interleave. A partial write landing in that same window would put current-shaped
  // keys next to stale ones, and nothing checks. In practice every write in the background is
  // downstream of a read, so nothing writes before the migration has been delivered, and the popup
  // and settings pages have to be opened by a human, which is several orders of magnitude slower
  // than a storage round trip.
  try {
    // The session state has no versions to migrate between because of this: throwing the whole area
    // away on install means every read of it is a read of what this version wrote. It costs a login
    // and a poll, both of which happen on browser restart anyway.
    await SessionState.clear();
    await migrateStoredState();
  } catch (e) {
    saveLastSevereError(e, "could not initialize stored state");
    return;
  }

  // Menu items outlive the background context, so they are created once here rather than on every
  // start. removeAll first because onInstalled also fires for browser updates, and creating an id
  // that already exists is an error.
  await browser.contextMenus.removeAll();
  createContextMenu();
});

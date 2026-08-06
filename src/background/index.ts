import "../common/init/nonContentContext";
import { migrateStoredState, onStoredStateChange } from "../common/state";
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
  // A failed migration is permanent. There is no documented retry for onInstalled, so the extension
  // then runs against state it cannot interpret. Bailing here at least leaves a record in the
  // debugging output rather than half-migrating and pretending otherwise.
  //
  // Readers can beat the migration. Anything reading between this context starting and the write
  // below landing gets the old shape typed as the new one. The one place that genuinely races is
  // the initial read in onStoredStateChange above, since it is kicked off during this same module
  // evaluation; it may throw once on a shape it does not recognize, and then correct itself,
  // because finishing the migration writes to storage and every listener re-runs on that.
  //
  // Writers could interleave. A partial write landing in that same window would put current-shaped
  // keys next to stale ones, and nothing checks. In practice every write in the background is
  // downstream of a read, and the popup and settings pages have to be opened by a human, which is
  // several orders of magnitude slower than a storage round trip.
  try {
    await migrateStoredState();
  } catch (e) {
    saveLastSevereError(e, "could not migrate stored state");
    return;
  }

  // Menu items outlive the background context, so they are created once here rather than on every
  // start. removeAll first because onInstalled also fires for browser updates, and creating an id
  // that already exists is an error.
  await browser.contextMenus.removeAll();
  createContextMenu();
});

import "../settings/index.css";
import { setupGlobalErrorHandler } from "../common/errorHandlers";

setupGlobalErrorHandler();

import { mount, unmount } from "svelte";
import type { Settings, State } from "../common/state/defaults";
import { onStoredStateChange } from "../common/state/listen";
import { saveLastSevereError } from "../common/errorHandlers";
import SettingsForm from "./SettingsForm.svelte";

function clearError() {
  const clearedError: Pick<State, "lastSevereError"> = {
    lastSevereError: undefined,
  };
  browser.storage.local.set(clearedError);
}

async function saveSettings(settings: Settings): Promise<boolean> {
  try {
    await browser.storage.local.set({ settings });
    return true;
  } catch (e) {
    saveLastSevereError(e);
    return false;
  }
}

const ELEMENT = document.getElementById("body")!;

let currentComponent: Record<string, unknown> | undefined;

onStoredStateChange((state) => {
  if (!state.settings) return;

  if (currentComponent) {
    unmount(currentComponent);
  }

  currentComponent = mount(SettingsForm, {
    target: ELEMENT,
    props: {
      extensionState: state,
      saveSettings,
      lastSevereError: state.lastSevereError,
      clearError,
    },
  });
});

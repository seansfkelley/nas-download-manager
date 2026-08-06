import "./index.css";
import "../common/init/nonContentContext";
import { createRoot } from "react-dom/client";

import { Logging, onExtensionStateChange, PersistentState, Settings } from "../common/state";
import { SettingsForm } from "./SettingsForm";
import { saveLastSevereError } from "../common/errorHandlers";

function clearError() {
  const clearedError: Logging = {
    lastSevereError: undefined,
  };
  PersistentState.set(clearedError);
}

async function saveSettings(settings: Settings): Promise<boolean> {
  console.log("persisting settings...");
  try {
    await PersistentState.set({ settings });
    console.log("done persisting settings");
    return true;
  } catch (e) {
    saveLastSevereError(e);
    return false;
  }
}

// Created once. Calling createRoot inside the listener would build a fresh root, and so throw away
// all component state, every time the stored state changed.
const ROOT = createRoot(document.getElementById("body")!);

onExtensionStateChange((state) => {
  ROOT.render(
    <SettingsForm
      extensionState={state}
      saveSettings={saveSettings}
      lastSevereError={state.lastSevereError}
      clearError={clearError}
    />,
  );
});

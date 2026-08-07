import "./index.css";
import "../common/init/nonContentContext";
import { createRoot } from "react-dom/client";

import { saveLastSevereError } from "../common/errorHandlers";
import { PersistentState, reactToPersistentState, Settings } from "../common/state";

import { SettingsForm } from "./SettingsForm";

function clearError() {
  PersistentState.set({ lastSevereError: undefined });
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

reactToPersistentState("settings", "lastSevereError", ({ settings, lastSevereError }) => {
  ROOT.render(
    <SettingsForm
      settings={settings}
      saveSettings={saveSettings}
      lastSevereError={lastSevereError}
      clearError={clearError}
    />,
  );
});

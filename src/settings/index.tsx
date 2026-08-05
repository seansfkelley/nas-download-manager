import "./index.scss";
import "../common/init/nonContentContext";
import * as ReactDOM from "react-dom";

import { Logging, onStoredStateChange, State, Settings } from "../common/state";
import { SettingsForm } from "./SettingsForm";
import { saveLastSevereError } from "../common/errorHandlers";

function clearError() {
  const clearedError: Logging = {
    lastSevereError: undefined,
  };
  State.set(clearedError);
}

async function saveSettings(settings: Settings): Promise<boolean> {
  console.log("persisting settings...");
  try {
    await State.set({ settings });
    console.log("done persisting settings");
    return true;
  } catch (e) {
    saveLastSevereError(e);
    return false;
  }
}

const ELEMENT = document.getElementById("body")!;

onStoredStateChange((state) => {
  ReactDOM.render(
    <SettingsForm
      extensionState={state}
      saveSettings={saveSettings}
      lastSevereError={state.lastSevereError}
      clearError={clearError}
    />,
    ELEMENT,
  );
});

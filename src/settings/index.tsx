import "./index.scss";
import "../common/init/nonContentContext";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { State, Logging, onStoredStateChange, Settings } from "../common/state";
import { SettingsForm } from "./SettingsForm";
import { saveLastSevereError } from "../common/errorHandlers";

function clearError() {
  const clearedError: Logging = {
    lastSevereError: undefined,
  };
  browser.storage.local.set<Partial<State>>(clearedError);
}

async function saveSettings(settings: Settings): Promise<boolean> {
  console.log("persisting settings...");
  try {
    await browser.storage.local.set<Partial<State>>({ settings });
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

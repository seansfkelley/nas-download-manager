import "./index.scss";
import "../common/init/nonContentContext";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { State as ExtensionState, Logging, onStoredStateChange } from "../common/state";
import { saveSettings } from "./settingsUtils";
import { SettingsForm } from "./SettingsForm";

function clearError() {
  const clearedError: Logging = {
    lastSevereError: undefined,
  };
  browser.storage.local.set<Partial<ExtensionState>>(clearedError);
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

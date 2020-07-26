import "../../scss/fields.scss";
import "../../scss/popup.scss";
import "../../scss/non-ideal-state.scss";
import "../common/init/extensionContext";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { onStoredStateChange, Settings, State } from "../common/state";
import { onUnhandledError } from "../common/errorHandlers";
import { FatalError } from "./FatalError";
import { PopupWrapper } from "./PopupWrapper";
import { PollTasks } from "../common/apis/messages";

const ELEMENT = document.getElementById("body")!;

function updateSettings(settings: Settings) {
  browser.storage.local.set<Partial<State>>({ settings });
}

PollTasks.send();
setInterval(() => {
  PollTasks.send();
}, 10000);

onStoredStateChange((storedState) => {
  try {
    ReactDOM.render(<PopupWrapper state={storedState} updateSettings={updateSettings} />, ELEMENT);
  } catch (e) {
    onUnhandledError(e);
    ReactDOM.render(<FatalError error={e} />, ELEMENT);
  }
});

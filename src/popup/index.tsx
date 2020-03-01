import "../../scss/fields.scss";
import "../../scss/popup.scss";
import "../../scss/non-ideal-state.scss";
import "../common/init/extensionContext";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { onStoredStateChange, Settings, State } from "../common/state";
import { onUnhandledError } from "../common/errorHandlers";
import { getSharedObjects } from "../common/apis/sharedObjects";
import { FatalError } from "./FatalError";
import { PrivateBrowsingUnsupported } from "./PrivateBrowsingUnsupported";
import { PopupWrapper } from "./PopupWrapper";
import { PollTasksMessage } from "../common/apis/messages";

const ELEMENT = document.getElementById("body")!;

function updateSettings(settings: Settings) {
  browser.storage.local.set<Partial<State>>({ settings });
}

PollTasksMessage.send();
setInterval(() => {
  PollTasksMessage.send();
}, 10000);

getSharedObjects()
  .then(objects => {
    if (objects) {
      const { api } = objects;
      onStoredStateChange(storedState => {
        ReactDOM.render(
          <PopupWrapper api={api} state={storedState} updateSettings={updateSettings} />,
          ELEMENT,
        );
      });
    } else {
      ReactDOM.render(<PrivateBrowsingUnsupported />, ELEMENT);
    }
  })
  .catch(e => {
    onUnhandledError(e);
    ReactDOM.render(<FatalError error={e} />, ELEMENT);
  });

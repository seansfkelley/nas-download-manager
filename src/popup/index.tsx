import "../../scss/fields.scss";
import "../../scss/popup.scss";
import "../../scss/non-ideal-state.scss";
import "../common/init/extensionContext";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { onStoredStateChange, Settings } from "../common/state";
import { onUnhandledError } from "../common/errorHandlers";
import { getSharedObjects } from "../common/apis/sharedObjects";
import { pollTasks } from "../common/apis/actions";
import { FatalError } from "./FatalError";
import { PrivateBrowsingUnsupported } from "./PrivateBrowsingUnsupported";
import { PopupWrapper } from "./PopupWrapper";

const ELEMENT = document.getElementById("body")!;

function updateSettings(settings: Partial<Settings>) {
  browser.storage.local.set(settings);
}

getSharedObjects()
  .then(objects => {
    if (objects) {
      const { api } = objects;

      pollTasks(api);
      setInterval(() => {
        pollTasks(api);
      }, 10000);

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

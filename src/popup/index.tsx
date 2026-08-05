import "./index.scss";
import "../common/init/nonContentContext";
import { createRoot } from "react-dom/client";

import { onStoredStateChange, State, Settings } from "../common/state";
import { FatalError } from "./FatalError";
import { FatalErrorWrapper } from "./FatalErrorWrapper";
import { PopupWrapper } from "./PopupWrapper";
import { PollTasks } from "../common/apis/messages";

// Created once. Calling createRoot inside the listener would build a fresh root, and so throw away
// all component state, every time the stored state changed.
//
// onUncaughtError replaces the try/catch that used to wrap the synchronous ReactDOM.render. React
// renders asynchronously now, so a throw during render never reaches the caller. FatalErrorWrapper
// still catches anything below it; this covers what it cannot, such as its own render throwing.
const ROOT = createRoot(document.getElementById("body")!, {
  onUncaughtError: (error) => {
    ROOT.render(<FatalError error={error} />);
  },
});

function updateSettings(settings: Settings) {
  State.set({ settings });
}

PollTasks.send();
setInterval(() => {
  PollTasks.send();
}, 10000);

onStoredStateChange((storedState) => {
  ROOT.render(
    <FatalErrorWrapper state={storedState}>
      <PopupWrapper state={storedState} updateSettings={updateSettings} />
    </FatalErrorWrapper>,
  );
});

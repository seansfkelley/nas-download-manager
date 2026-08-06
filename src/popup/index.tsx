import "./index.css";
import "../common/init/nonContentContext";
import { createRoot } from "react-dom/client";

import {
  type CachedTasks,
  getCachedTasks,
  onCachedTasksChange,
  onPersistentStateChange,
  PersistentState,
  Settings,
} from "../common/state";
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
  PersistentState.set({ settings });
}

PollTasks.send();
setInterval(() => {
  PollTasks.send();
}, 10000);

// The two halves arrive separately and neither waits for the other. Tasks start out empty rather
// than absent so that the settings half alone is enough to render, which is what makes the popup
// come up with its chrome in place while the first poll is still in flight.
let persistentState: PersistentState | undefined;
let cachedTasks: CachedTasks = getCachedTasks({});

function render() {
  if (persistentState == null) {
    return;
  }
  ROOT.render(
    <FatalErrorWrapper state={persistentState}>
      <PopupWrapper
        state={persistentState}
        cachedTasks={cachedTasks}
        updateSettings={updateSettings}
      />
    </FatalErrorWrapper>,
  );
}

onPersistentStateChange((state) => {
  persistentState = state;
  render();
});

onCachedTasksChange((tasks) => {
  cachedTasks = tasks;
  render();
});

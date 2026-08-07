import "./index.css";
import "../common/init/nonContentContext";
import { createRoot } from "react-dom/client";

import {
  type TaskState,
  reactToPersistentState,
  reactToSessionState,
  PersistentState,
  type Settings,
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

// The two areas are subscribed to separately and arrive in whichever order they arrive in, so the
// first delivery of each is held until the other has been seen.
let settings: Settings | undefined;
let cachedTasks: TaskState | undefined;

function render() {
  if (settings == null || cachedTasks == null) {
    return;
  }
  ROOT.render(
    <FatalErrorWrapper settings={settings}>
      <PopupWrapper settings={settings} cachedTasks={cachedTasks} updateSettings={updateSettings} />
    </FatalErrorWrapper>,
  );
}

reactToPersistentState("settings", (state) => {
  settings = state.settings;
  render();
});

reactToSessionState(
  "tasks",
  "taskFetchFailureReason",
  "tasksLastInitiatedFetchTimestamp",
  "tasksLastCompletedFetchTimestamp",
  (state) => {
    cachedTasks = state;
    render();
  },
);

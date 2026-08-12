import "./index.css";
import "../common/init/nonContentContext";
import { createRoot } from "react-dom/client";

import { FetchTasks } from "../common/apis/messages";
import {
  PersistentState,
  SessionState,
  Settings,
  reactToPersistentState,
  reactToSessionState,
} from "../common/state";

import { FatalError } from "./FatalError";
import { FatalErrorWrapper } from "./FatalErrorWrapper";
import { PopupWrapper } from "./PopupWrapper";

const ROOT = createRoot(document.getElementById("body")!, {
  onUncaughtError: (error) => {
    ROOT.render(<FatalError error={error} />);
  },
});

function updateSettings(settings: Settings) {
  PersistentState.set({ settings });
}

const POLL_INTERVAL_MS = 3000;

// Chained rather than an interval so a slow or unresponsive NAS doesn't stack up overlapping fetches.
async function pollTasks() {
  try {
    await FetchTasks.send();
  } catch (e) {
    console.error("error while polling for tasks", e);
  }
  setTimeout(pollTasks, POLL_INTERVAL_MS);
}

pollTasks();

reactToPersistentState("settings", "lastSevereError", async ({ settings, lastSevereError }) => {
  const sessionState = await SessionState.get();

  ROOT.render(
    <FatalErrorWrapper settings={settings} lastSevereError={lastSevereError}>
      <PopupWrapper settings={settings} updateSettings={updateSettings} tasks={sessionState} />
    </FatalErrorWrapper>,
  );
});

reactToSessionState(
  "tasks",
  "taskFetchFailureReason",
  "tasksLastCompletedFetchTimestamp",
  "tasksLastInitiatedFetchTimestamp",
  async (tasks) => {
    const persistentState = await PersistentState.get();

    if (persistentState == null) {
      ROOT.render(<FatalError error="migration did not complete before popup was rendered" />);
    } else {
      ROOT.render(
        <FatalErrorWrapper
          settings={persistentState.settings}
          lastSevereError={persistentState.lastSevereError}
        >
          <PopupWrapper
            settings={persistentState.settings}
            updateSettings={updateSettings}
            tasks={tasks}
          />
        </FatalErrorWrapper>,
      );
    }
  },
);

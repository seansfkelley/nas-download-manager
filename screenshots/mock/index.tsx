import "../../src/popup/index.css";
import "./stubMessages";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { sendNotification } from "../../src/common/sendNotification";
import { PopupWrapper } from "../../src/popup/PopupWrapper";

import { SCENARIOS, SETTINGS } from "./fixtures";
import { maximizeWindow } from "./window";

function MockPopup() {
  const [settings, setSettings] = useState(SETTINGS);
  // Opens on the scenario the store shots use rather than on the empty one.
  const [scenario, setScenario] = useState(2);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Otherwise typing a URL into the add-download form flips scenarios out from under you.
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
        return;
      }

      // Tested rather than coerced because Number(" ") is 0, which would make space select the first
      // scenario.
      const index = /^[0-9]$/.test(event.key) ? Number(event.key) : -1;
      if (index >= 0 && index < SCENARIOS.length) {
        console.log("scenario:", SCENARIOS[index].name);
        setScenario(index);
      } else if (event.key === "w") {
        // Dismisses the popup, since the window it is anchored to moves out from under it.
        maximizeWindow();
      } else if (event.key === "n") {
        sendNotification(
          "big-buck-bunny-1080p-30fps.mp4",
          browser.i18n.getMessage("Download_finished"),
          "success",
        );
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <PopupWrapper
      settings={settings}
      tasks={SCENARIOS[scenario].state}
      updateSettings={setSettings}
    />
  );
}

createRoot(document.getElementById("body")!).render(<MockPopup />);

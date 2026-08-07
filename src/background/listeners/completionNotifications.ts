import { saveLastSevereError } from "../../common/errorHandlers";
import { fetchTasksIntoStorage } from "../actions";
import { getSynologyClient } from "../getSynologyClient";

const POLL_ALARM_NAME = "poll-tasks";

// "Ensure" = "only do work if necessary". Prevents timer resetting and consequent polling if the
// user does something that triggers settings changes repeatedly, like toggling checkboxes.
export async function ensureCompletionPollingState(enabled: boolean) {
  const existing = await browser.alarms.get(POLL_ALARM_NAME);
  if (enabled && existing == null) {
    await browser.alarms.create(POLL_ALARM_NAME, {
      // On initial create, likely browser start time, start polling right away.
      delayInMinutes: 0,
      // Chrome sets a minimum of 30 seconds, which is fine for us, I guess. Hardcode it.
      periodInMinutes: 0.5,
    });
  } else if (!enabled && existing != null) {
    await browser.alarms.clear(POLL_ALARM_NAME);
  }
}

export function initializeCompletionPollingListener() {
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === POLL_ALARM_NAME) {
      try {
        let client = await getSynologyClient();
        await fetchTasksIntoStorage(client);
      } catch (error) {
        saveLastSevereError(error);
      }
    }
  });
}

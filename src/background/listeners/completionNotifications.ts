import { getBackgroundContext } from "../backgroundState";
import { saveLastSevereError } from "../../common/errorHandlers";
import { pollTasks } from "../actions";

const POLL_ALARM_NAME = "poll-tasks";

export async function setCompletionPollingEnabled(enabled: boolean) {
  if (enabled) {
    // Overwrites any existing alarm.
    await browser.alarms.create(POLL_ALARM_NAME, {
      delayInMinutes: 0,
      // Chrome sets a minimum of 30 seconds, which is fine for us, I guess. Hardcode it.
      periodInMinutes: 0.5,
    });
  } else {
    await browser.alarms.clear(POLL_ALARM_NAME);
  }
}

export function initializeCompletionPollingListener() {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLL_ALARM_NAME) {
      getBackgroundContext()
        .then(({ api }) => pollTasks(api))
        .catch(saveLastSevereError);
    }
  });
}

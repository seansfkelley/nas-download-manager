import { SynologyClient } from "../../common/apis/synology";
import { Settings } from "../../common/state";
import { fetchTasks } from "../actions";

export const POLL_TASKS_ALARM = "poll-tasks";

export async function updateBackgroundPollAlarm(client: SynologyClient, settings: Settings) {
  if (!settings.notifications.enableCompletionNotifications) {
    console.log("cancelling polling alarm");
    await browser.alarms.clear(POLL_TASKS_ALARM);
  } else {
    // Recreating an alarm restarts its period, so make sure to only recreate it if it doesn't exist.
    if ((await browser.alarms.get(POLL_TASKS_ALARM)) == null) {
      console.log("creating polling alarm");
      browser.alarms.create(POLL_TASKS_ALARM, {
        // Chrome clamps alarms to 30 seconds regardless. That's okay for us.
        periodInMinutes: 0.5,
      });

      // delayInMinutes=0 doesn't seem to work, so just kick off a check now.
      await fetchTasks(client);
    }
  }
}

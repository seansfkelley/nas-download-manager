import { fetchTasks } from "../actions";
import { singleton } from "../clientSingleton";
import { POLL_TASKS_ALARM } from "../state-listeners/updateBackgroundPollAlarm";

export function registerAlarms() {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLL_TASKS_ALARM) {
      console.log("poll alarm fired");
      fetchTasks(singleton);
    }
  });
}

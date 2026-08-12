import { fetchTasks } from "../actions";

export function registerAlarms() {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLL_TASKS_ALARM) {
      console.log("poll alarm fired");
      fetchTasks(client);
    }
  });
}

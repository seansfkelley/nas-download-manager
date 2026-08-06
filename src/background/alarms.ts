import { getMutableStateSingleton } from "./backgroundState";
import { pollTasks } from "./actions";

const POLL_ALARM_NAME = "poll-tasks";

// Chrome clamps packed extensions to a 30 second minimum and silently ignores anything shorter,
// which is why this is a constant rather than a setting.
const POLL_INTERVAL_MINUTES = 0.5;

// The alarm registry is the state here, rather than anything in module scope: creating an alarm
// that already exists restarts its period, so an unconditional create on every state change would
// keep pushing the next poll out of reach.
export async function setPollingEnabled(enabled: boolean) {
  const existing = await browser.alarms.get(POLL_ALARM_NAME);
  if (enabled && existing == null) {
    browser.alarms.create(POLL_ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MINUTES });
  } else if (!enabled && existing != null) {
    await browser.alarms.clear(POLL_ALARM_NAME);
  }
}

export function initializeAlarmHandler() {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLL_ALARM_NAME) {
      pollTasks(getMutableStateSingleton().api);
    }
  });
}

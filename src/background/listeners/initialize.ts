import { registerListener } from "./registry";
import { sendCompletionNotifications } from "./sendCompletionNotifications";
import { updateApiAndReloadTasks } from "./updateApiAndReloadTasks";
import { updateBadge } from "./updateBadge";

export function initializeListeners() {
  registerListener(sendCompletionNotifications);
  registerListener(updateApiAndReloadTasks);
  registerListener(updateBadge);
}

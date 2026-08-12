export type NotificationType = "regular" | "success" | "failure";

const TYPE_TO_FILE_SUFFIX: Record<NotificationType, string> = {
  regular: "",
  success: "-success",
  failure: "-failure",
};

export function sendNotification(
  title: string,
  message?: string,
  type: NotificationType = "regular",
  // Don't use a file-local counter so if this gets unloaded/reloaded it won't clash.
  id: string = `notification-${crypto.randomUUID()}`,
) {
  browser.notifications.create(id, {
    type: "basic",
    title,
    message: message || "",
    iconUrl: browser.runtime.getURL(`icons/icon-256${TYPE_TO_FILE_SUFFIX[type]}.png`),
  });
  return id;
}

import uniqueId from 'lodash-es/uniqueId';

export type NotificationType = 'regular' | 'success' | 'failure';

const TYPE_TO_FILE_SUFFIX: Record<NotificationType, string> = {
  'regular': '',
  'success': '-success',
  'failure': '-failure'
};

export function notify(title: string, message?: string, type: NotificationType = 'regular', id: string = uniqueId('notification-')) {
  browser.notifications.create(id, {
    type: 'basic',
    title,
    message: message || '',
    iconUrl: browser.extension.getURL(`icons/icon-256${TYPE_TO_FILE_SUFFIX[type]}.png`)
  });
  return id;
}

import { uniqueId } from 'lodash-es';

export function notify(title: string, message?: string, id: string = uniqueId('notification-')) {
  browser.notifications.create(id, {
    type: 'basic',
    title,
    message: message || '',
    iconUrl: browser.extension.getURL('icons/icon-64.png')
  });
  return id;
}

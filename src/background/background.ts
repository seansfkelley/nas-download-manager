import { DownloadStation, ERROR_CODES } from '../api';
import { TaskPoller } from '../taskPoller';
import { getHostUrl, onStoredStateChange } from '../common';

function notify(title: string, message?: string) {
  return browser.notifications.create(undefined, {
    type: 'basic',
    title,
    message: message || ''
  });
}

const poller = new TaskPoller;
const START_TIME = Date.now();

let finishedTaskIds: string[] | undefined;

onStoredStateChange(storedState => {
  poller.updateSettings({
    hostname: getHostUrl(storedState.connection),
    sid: storedState.sid,
    interval: storedState.notifications.pollingInterval,
    enabled: storedState.notifications.enabled
  });
});

onStoredStateChange(storedState => {
  if (storedState.tasksFetchUpdateTimestamp != null && storedState.tasksFetchUpdateTimestamp > START_TIME && storedState.tasksFetchFailureMessage == null) {
    const updatedFinishedTaskIds = storedState.tasks
      .filter(t => t.status === 'finished' || t.status === 'seeding')
      .map(t => t.id);
    if (finishedTaskIds != null) {
      const newlyFinishedTaskIds = updatedFinishedTaskIds.filter(id => finishedTaskIds!.indexOf(id) === -1);
      newlyFinishedTaskIds.forEach(id => {
        const task = storedState.tasks.filter(t => t.id === id)[0];
        if (storedState.notifications.enabled) {
          notify(`${task.title}`, 'Download finished');
        }
      });
    }
    finishedTaskIds = (finishedTaskIds || []).concat(updatedFinishedTaskIds.filter(taskId => {
      return !finishedTaskIds || finishedTaskIds.indexOf(taskId) === -1;
    }));
  }
});

const CONTEXT_MENU_ID = browser.contextMenus.create({
  title: 'Download with DownloadStation',
  contexts: [ 'link' ]
});

const DOWNLOADABLE_URI_PROTOCOLS = [
  'magnet',
  'ftp',
  'ftps'
];

onStoredStateChange(storedState => {
  const hostUrl = getHostUrl(storedState.connection)
  browser.contextMenus.update(CONTEXT_MENU_ID, {
    enabled: !!hostUrl && !!storedState.sid,
    onclick: (data) => {
      const link = data.linkUrl;
      if (link && DOWNLOADABLE_URI_PROTOCOLS.some(protocol => link.slice(0, protocol.length + 1) === `${protocol}:`)) {
        DownloadStation.Task.Create(hostUrl!, storedState.sid!, {
          uri: [ link ]
        })
          .then(result => {
            if (result.success) {
              notify('Download added');
            } else {
              notify(
                'Failed to add download',
                ERROR_CODES.common[result.error.code] || ERROR_CODES.task[result.error.code] || 'Unknown error'
              );
            }
          });
      } else {
        notify('Failed to add download', `Link must be one of ${DOWNLOADABLE_URI_PROTOCOLS.join(', ')}`);
      }
    }
  });
});

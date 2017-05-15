import { isEqual } from 'lodash-es';
import { StatefulApi, SessionName } from '../api';
import { getHostUrl, onStoredStateChange, NotificationSettings, DEFAULT_SETTINGS, setSharedObjects, notify, addDownloadTask } from '../common';
import { pollTasks } from '../pollTasks';

const api = new StatefulApi({});
const START_TIME = Date.now();

setSharedObjects({ api });

let finishedTaskIds: string[] | undefined;

let notificationSettings: NotificationSettings = DEFAULT_SETTINGS.notifications;
let notificationInterval: number | undefined;

onStoredStateChange(storedState => {
  api.updateSettings({
    baseUrl: getHostUrl(storedState.connection),
    account: storedState.connection.username,
    passwd: storedState.connection.password,
    session: SessionName.DownloadStation
  });

  if (!isEqual(storedState.notifications, notificationSettings)) {
    notificationSettings = storedState.notifications;
    clearInterval(notificationInterval!);
    if (notificationSettings.enabled) {
      setInterval(() => { pollTasks(api); }, notificationSettings.pollingInterval * 1000);
    }
  }
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

browser.contextMenus.update(CONTEXT_MENU_ID, {
  enabled: true,
  onclick: (data) => {
    addDownloadTask(api, data.linkUrl!);
  }
});

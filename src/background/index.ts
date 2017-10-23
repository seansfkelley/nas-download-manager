import { isEqual } from 'lodash-es';
import { ApiClient, SessionName } from 'synology-typescript-api';
import { getHostUrl, onStoredStateChange, NotificationSettings, DEFAULT_SETTINGS } from '../state';
import { setSharedObjects, notify } from '../browserApi';
import { addDownloadTaskAndPoll, pollTasks, clearCachedTasks } from '../apiActions';
import { shimExtensionApi } from '../apiShim';

shimExtensionApi();

const api = new ApiClient({});
const START_TIME = Date.now();

setSharedObjects({ api });

let finishedTaskIds: string[] | undefined;

let notificationSettings: NotificationSettings = DEFAULT_SETTINGS.notifications;
let notificationInterval: number | undefined;

onStoredStateChange(storedState => {
  const didUpdateSettings = api.updateSettings({
    baseUrl: getHostUrl(storedState.connection),
    account: storedState.connection.username,
    passwd: storedState.connection.password,
    session: SessionName.DownloadStation
  });

  if (didUpdateSettings) {
    clearCachedTasks()
      .then(() => { pollTasks(api); });
  }

  if (!isEqual(storedState.notifications, notificationSettings)) {
    notificationSettings = storedState.notifications;
    clearInterval(notificationInterval!);
    if (notificationSettings.enabled) {
      notificationInterval = setInterval(() => { pollTasks(api); }, notificationSettings.pollingInterval * 1000);
    }
  }

  if (storedState.taskFetchFailureReason) {
    browser.browserAction.setIcon({
      path: {
        '16': 'icons/icon-16-disabled.png',
        '32': 'icons/icon-32-disabled.png',
        '64': 'icons/icon-64-disabled.png',
        '128': 'icons/icon-128-disabled.png',
        '256': 'icons/icon-256-disabled.png'
      }
    });

    browser.browserAction.setBadgeText({
      text: ''
    });

    browser.browserAction.setBadgeBackgroundColor({ color: [ 217, 0, 0, 255 ] });
  } else {
    browser.browserAction.setIcon({
      path: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '64': 'icons/icon-64.png',
        '128': 'icons/icon-128.png',
        '256': 'icons/icon-256.png'
      }
    });

    browser.browserAction.setBadgeText({
      text: storedState.tasks.length === 0 ? '' : storedState.tasks.length.toString()
    });

    browser.browserAction.setBadgeBackgroundColor({ color: [ 0, 217, 0, 255 ] });
  }

  if (storedState.tasksLastCompletedFetchTimestamp != null && storedState.tasksLastCompletedFetchTimestamp > START_TIME && storedState.taskFetchFailureReason == null) {
    const updatedFinishedTaskIds = storedState.tasks
      .filter(t => t.status === 'finished' || t.status === 'seeding')
      .map(t => t.id);
    if (finishedTaskIds != null) {
      const newlyFinishedTaskIds = updatedFinishedTaskIds.filter(id => finishedTaskIds!.indexOf(id) === -1);
      newlyFinishedTaskIds.forEach(id => {
        const task = storedState.tasks.filter(t => t.id === id)[0];
        if (storedState.notifications.enabled) {
          notify(`${task.title}`, browser.i18n.getMessage('Download_finished'));
        }
      });
    }
    finishedTaskIds = (finishedTaskIds || []).concat(updatedFinishedTaskIds.filter(taskId => {
      return !finishedTaskIds || finishedTaskIds.indexOf(taskId) === -1;
    }));
  }
});

browser.contextMenus.create({
  enabled: true,
  title: browser.i18n.getMessage('Download_with_DownloadStation'),
  contexts: [ 'link', 'audio', 'video', 'selection' ],
  onclick: (data) => {
    if (data.linkUrl) {
      addDownloadTaskAndPoll(api, data.linkUrl)
    } else if (data.srcUrl) {
      addDownloadTaskAndPoll(api, data.srcUrl);
    } else if (data.selectionText) {
      // The cheapest of checks. Actual invalid URLs will be caught later.
      if (data.selectionText.indexOf('://') !== -1) {
        addDownloadTaskAndPoll(api, data.selectionText);
      } else {
        notify(browser.i18n.getMessage('Failed_to_add_download'), browser.i18n.getMessage('Selected_text_is_not_a_valid_URL'));
      }
    } else {
      notify(browser.i18n.getMessage('Failed_to_add_download'), browser.i18n.getMessage('URL_is_empty_or_missing'));
    }
  }
});

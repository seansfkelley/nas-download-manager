import { TaskPoller } from '../taskPoller';
import { getHostUrl, onStoredStateChange } from '../common';

const poller = new TaskPoller;

let finishedTaskIds: string[] | undefined;

onStoredStateChange(storedState => {
  poller.setHostname(getHostUrl(storedState.connection));
  poller.setSid(storedState.sid);
  poller.setInterval(storedState.notifications.pollingInterval);
  poller.setEnabled(storedState.notifications.enabled);
});

onStoredStateChange(storedState => {
  const updatedFinishedTaskIds = storedState.tasks
    .filter(t => t.status === 'finished' || t.status === 'seeding')
    .map(t => t.id);
  if (finishedTaskIds != null) {
    const newlyFinishedTaskIds = updatedFinishedTaskIds.filter(id => finishedTaskIds!.indexOf(id) === -1);
    newlyFinishedTaskIds.forEach(id => {
      const task = storedState.tasks.filter(t => t.id === id)[0];
      browser.notifications.create(undefined, {
        type: 'basic',
        title: `${task.title}`,
        message: 'Download finished'
      });
    });
  }
  finishedTaskIds = updatedFinishedTaskIds;
}, false);

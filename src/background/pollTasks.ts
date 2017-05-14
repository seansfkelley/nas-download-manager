import { StatefulApi, isConnectionFailure, errorMessageFromCode } from '../api';
import { CachedTasks } from '../common';

export function pollTasks(api: StatefulApi) {
  return api.DownloadStation.Task.List({
    offset: 0,
    limit: -1,
    additional: [ 'transfer' ]
  })
    .then(response => {
      let cachedTasks: Partial<CachedTasks> = {
        tasksFetchUpdateTimestamp: Date.now()
      };

      if (isConnectionFailure(response)) {
        cachedTasks.tasksFetchFailureMessage = response.failureMessage;
      } else if (response.success) {
        cachedTasks.tasks = response.data.tasks;
        cachedTasks.tasksFetchFailureMessage = null;
      } else {
        cachedTasks.tasksFetchFailureMessage = errorMessageFromCode(response.error.code, 'task');
      }

      return browser.storage.local.set(cachedTasks);
    })
    .catch(error => {
      let failureMessage;
      // TODO: Unify this knowledge with utils.ts and settings.tsx.
      if (error && error.response && error.response.status === 400) {
        failureMessage = 'Connection failure (likely wrong protocol).';
      } else if (error && error.message === 'Network Error') {
        failureMessage = 'Connection failure (likely incorrect hostname/port or no internet connection).';
      } else {
        console.log(error);
        failureMessage = 'Unknown error.';
      }

      const cachedTasks: Partial<CachedTasks> = {
        tasksFetchFailureMessage: failureMessage,
        tasksFetchUpdateTimestamp: Date.now()
      };

      return browser.storage.local.set(cachedTasks);
    });
}

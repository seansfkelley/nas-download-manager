import { DownloadStation, ERROR_CODES } from './api';
import { CachedTasks } from './common';
import { shallowEqual } from './shallowEqual';

export interface PollerSettings {
  enabled: boolean;
  hostname: string;
  sid: string | undefined;
  interval: number;
}

const DEFAULT_SETTINGS: PollerSettings = {
  enabled: false,
  hostname: '',
  sid: undefined,
  interval: 60
};

export class TaskPoller {
  private tryPollCount: number = 0;
  private settings: PollerSettings = DEFAULT_SETTINGS;

  constructor(settings?: Partial<PollerSettings>) {
    this.updateSettings(settings || DEFAULT_SETTINGS);
  }

  public updateSettings(settings: Partial<PollerSettings>) {
    const newSettings = { ...this.settings, ...settings };
    const oldSettings = this.settings;
    this.settings = newSettings;

    if (!shallowEqual({ ...newSettings, interval: undefined }, { ...oldSettings, interval: undefined })) {
      this.tryPoll();
    }
  }

  // TODO: When is the correct time to call this? We want to call it when the hostname/sid change,
  // but we have to make sure that we aren't unconditionally dumping the cache whenever we open the
  // popup anew because we can't differentiate between "changing the hostname" and "setting the hostname
  // to a non-null value for the first time".
  // private resetTasks() {
  //   browser.storage.local.set({
  //     [TASKS_KEY]: []
  //   });
  // }

  private tryPoll() {
    const count = ++this.tryPollCount;
    if (this.settings.enabled && this.settings.hostname && this.settings.sid) {
      DownloadStation.Task.List(this.settings.hostname, this.settings.sid, {
        offset: 0,
        limit: -1
      })
        .then(response => {
          if (this.settings.enabled) {
            const cachedTasks: Partial<CachedTasks> = response.success
              ? {
                tasks: response.data.tasks,
                tasksFetchFailureMessage: undefined,
                tasksFetchUpdateTimestamp: Date.now()
              }
              : {
                tasksFetchFailureMessage: ERROR_CODES.common[response.error.code] || ERROR_CODES.task[response.error.code] || 'Unknown error.',
                tasksFetchUpdateTimestamp: Date.now()
              };
            return browser.storage.local.set(cachedTasks);
          } else {
            return Promise.resolve();
          }
        })
        .catch(error => {
          if (this.settings.enabled) {
            let failureMessage;
            // TODO: Unify this knowledge with utils.ts and settings.tsx.
            if (error && error.response && error.response.status === 400) {
              failureMessage = 'Connection failure (likely wrong protocol).';
            } else if (error && error.message === 'Network Error') {
              failureMessage = 'Connection failure (likely incorrect hostname/port).';
            } else {
              console.log(error);
              failureMessage = 'Unknown error.';
            }

            const cachedTasks: Partial<CachedTasks> = {
              tasksFetchFailureMessage: failureMessage,
              tasksFetchUpdateTimestamp: Date.now()
            };

            return browser.storage.local.set(cachedTasks);
          } else {
            return Promise.resolve();
          }
        })
        .then(() => {
          if (this.settings.enabled) {
            setTimeout(() => {
              // Each top-level tryPoll call is its own potentially-infinite chain of tryPoll calls.
              // Abort this chain if another chain was created, i.e., the count changed.
              if (count === this.tryPollCount) {
                this.tryPoll();
              }
            }, this.settings.interval * 1000);
          }
        });
    }
  }
}

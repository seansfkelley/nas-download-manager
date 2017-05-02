import { DownloadStation, ERROR_CODES } from './api';
import { TASKS_KEY, LAST_POLLING_FAILURE_MESSAGE_KEY } from './common';

export class TaskPoller {
  private tryPollCount: number = 0;
  private enabled: boolean = false;
  private hostname: string | undefined = undefined;
  private sid: string | undefined = undefined;
  private interval: number = 60;

  public setEnabled(enabled: boolean) {
    if (enabled !== this.enabled) {
      this.enabled = enabled;
      this.tryPoll();
    }
  }

  public setHostname(hostname: string) {
    if (hostname !== this.hostname) {
      this.hostname = hostname;
      this.tryPoll();
    }
  }

  public setSid(sid: string | undefined) {
    if (sid !== this.sid) {
      this.sid = sid;
      this.tryPoll();
    }
  }

  public setInterval(interval: number) {
    this.interval = interval;
  }

  // TODO: When is the correct time to call this? We want to call it when the hostname/sid change,
  // but we have to make sure that we aren't unconditionally dumping the cache whenever we open the
  // popup anew because we can't differentiate between "changing the hostname" and "setting the hostname
  // to a non-null value for the first time".
  private resetTasks() {
    browser.storage.local.set({
      [TASKS_KEY]: []
    });
  }

  private tryPoll() {
    const count = ++this.tryPollCount;
    if (this.enabled && this.hostname && this.sid) {
      DownloadStation.Task.List(this.hostname, this.sid, {
        offset: 0,
        limit: -1,
      })
        .then(response => {
          if (this.enabled) {
            if (response.success) {
              browser.storage.local.set({
                [TASKS_KEY]: response.data.tasks,
                [LAST_POLLING_FAILURE_MESSAGE_KEY]: undefined
              });
            } else {
              browser.storage.local.set({
                [LAST_POLLING_FAILURE_MESSAGE_KEY]: ERROR_CODES.common[response.error.code] || ERROR_CODES.task[response.error.code] || 'Unknown error.'
              });
            }
          }
        })
        .catch(error => {
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

          browser.storage.local.set({
            [LAST_POLLING_FAILURE_MESSAGE_KEY]: failureMessage
          });
        })
        .then(() => {
          if (this.enabled) {
            setTimeout(() => {
              // Each top-level tryPoll call is its own potentially-infinite chain of tryPoll calls.
              // Abort this chain if another chain was created, i.e., the count changed.
              if (count === this.tryPollCount) {
                this.tryPoll();
              }
            }, this.interval * 1000);
          }
        });
    }
  }
}

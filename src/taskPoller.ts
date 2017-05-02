import { DownloadStation } from './api';
import { TASKS_KEY } from './common';

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
                [TASKS_KEY]: response.data.tasks
              });
            }

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
